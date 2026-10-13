/**
 * The free tracking check: the parts that are pure functions.
 *
 * A visitor types a URL; a server route fetches that page's HTML and this file
 * says whether four things are visible in it. That is all it is. It reads the
 * HTML the server sends, so anything a tag manager loads afterwards is
 * invisible to it, and the result says "found in the page source" or "not
 * found in the page source", never "installed" or "missing".
 *
 * The other half of this file is the gate on WHERE the server may fetch from.
 * A route that fetches a URL chosen by a stranger is a request forgery tool
 * unless every address is checked first; see isBlockedAddress.
 *
 * No I/O in here, so all of it is unit tested (tracking-check.test.ts). The
 * fetching is in app/api/tracking-check/route.ts.
 */

export const CHECK_IDS = ["gtm", "ga4", "meta_pixel", "consent"] as const;
export type CheckId = (typeof CHECK_IDS)[number];

export type CheckResult = {
  id: CheckId;
  found: boolean;
  /** What matched, for the reader: an id like GTM-ABC123, or a vendor name. */
  evidence: string | null;
};

/* -------------------------------------------------------------------------- */
/* Which URLs may be fetched                                                    */
/* -------------------------------------------------------------------------- */

export const MAX_URL_LENGTH = 2048;

/**
 * Turns what the visitor typed into a URL the route is willing to fetch, or
 * null. "example.com" is accepted and read as https.
 *
 * http and https only, default ports only, no credentials. A non-default port
 * is refused because the only reason to name one is to reach a service that
 * is not a public website.
 */
export function normaliseTarget(input: string): URL | null {
  const raw = input.trim();
  if (!raw || raw.length > MAX_URL_LENGTH) return null;

  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  if (url.port && url.port !== "80" && url.port !== "443") return null;

  const host = url.hostname.toLowerCase();
  // A name with no dot is a machine on somebody's network, not a website.
  if (!host.includes(".") && !host.includes(":")) return null;
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return null;
  if (host.endsWith(".internal") || host.endsWith(".home.arpa")) return null;

  url.hash = "";
  return url;
}

function ipv4ToNumber(address: string): number | null {
  const parts = address.split(".");
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n > 255) return null;
    value = value * 256 + n;
  }
  return value;
}

/** [first address, prefix length] for every IPv4 range that is not the public internet. */
const BLOCKED_V4: [string, number][] = [
  ["0.0.0.0", 8], // "this network"
  ["10.0.0.0", 8], // private
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local, and the cloud metadata address
  ["172.16.0.0", 12], // private
  ["192.0.0.0", 24], // protocol assignments
  ["192.0.2.0", 24], // documentation
  ["192.88.99.0", 24], // 6to4 relay
  ["192.168.0.0", 16], // private
  ["198.18.0.0", 15], // benchmarking
  ["198.51.100.0", 24], // documentation
  ["203.0.113.0", 24], // documentation
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved, and broadcast
];

function isBlockedV4(address: string): boolean {
  const value = ipv4ToNumber(address);
  if (value === null) return true;
  return BLOCKED_V4.some(([base, bits]) => {
    const start = ipv4ToNumber(base) ?? 0;
    const size = 2 ** (32 - bits);
    return value >= start && value < start + size;
  });
}

/**
 * True for any address the route must not connect to.
 *
 * This is checked against the address a name RESOLVES to, not the name, and
 * the connection is then made to that same address. Checking the name and
 * letting the HTTP client resolve it again would leave a gap in which the
 * answer can change.
 *
 * Anything that cannot be parsed is blocked. An unknown shape is not a reason
 * to try it.
 */
export function isBlockedAddress(address: string, family: 4 | 6): boolean {
  if (family === 4) return isBlockedV4(address);

  const lower = address.toLowerCase().split("%")[0];
  if (lower === "::" || lower === "::1") return true;

  // An IPv4 address wearing an IPv6 prefix is judged as the IPv4 address.
  const mapped = /^(?:::ffff:|64:ff9b::)(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
  if (mapped) return isBlockedV4(mapped[1]);
  if (lower.startsWith("::ffff:")) return true;

  const first = parseInt(lower.split(":")[0] || "0", 16);
  if (Number.isNaN(first)) return true;
  if ((first & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
  if ((first & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((first & 0xff00) === 0xff00) return true; // ff00::/8 multicast
  if (first === 0x2001 && lower.startsWith("2001:db8")) return true; // documentation
  // Only global unicast (2000::/3) is the public internet.
  return (first & 0xe000) !== 0x2000;
}

/* -------------------------------------------------------------------------- */
/* What is in the HTML                                                          */
/* -------------------------------------------------------------------------- */

/** Consent tools recognisable from a script URL or a global in the page source. */
const CONSENT_VENDORS: [string, RegExp][] = [
  ["Cookiebot", /consent\.cookiebot\.com|cookiebot\.com\/uc\.js/i],
  ["OneTrust", /cdn\.cookielaw\.org|onetrust|optanon/i],
  ["CookieYes", /cdn-cookieyes\.com|cookieyes/i],
  ["Usercentrics", /usercentrics\.eu|app\.usercentrics/i],
  ["iubenda", /iubenda\.com\/(?:cs|cookie-solution)|_iub\.csConfiguration/i],
  ["Termly", /app\.termly\.io/i],
  ["Osano", /cmp\.osano\.com/i],
  ["Didomi", /sdk\.privacy-center\.org|didomi/i],
  ["TrustArc", /consent\.trustarc\.com|truste\.com/i],
  ["Complianz", /complianz|cmplz/i],
  ["CookieScript", /cdn\.cookie-script\.com/i],
  ["Klaro", /klaro(?:\.min)?\.js|klaroConfig/i],
  ["Axeptio", /static\.axept\.io/i],
  ["Shopify privacy banner", /consent-tracking-api|Shopify\.customerPrivacy/i],
  ["Quantcast Choice", /quantcast\.mgr\.consensu\.org|cmp\.quantcast\.com/i],
];

/**
 * Looks for the four things in a page's HTML.
 *
 * Each pattern is deliberately narrow: an id in the vendor's own format, or
 * the vendor's own script host. A page that merely mentions "Google Analytics"
 * in an article is not a page running it.
 */
export function detect(html: string): CheckResult[] {
  const gtmId = /\bGTM-[A-Z0-9]{4,10}\b/.exec(html)?.[0] ?? null;
  const gtmScript = /googletagmanager\.com\/(?:gtm\.js|ns\.html)/i.test(html);

  const ga4Id = /\bG-[A-Z0-9]{6,12}\b/.exec(html)?.[0] ?? null;
  const ga4Script = /googletagmanager\.com\/gtag\/js\?id=G-/i.test(html);

  const pixelId =
    /fbq\(\s*['"]init['"]\s*,\s*['"](\d{8,20})['"]/.exec(html)?.[1] ??
    /facebook\.com\/tr\?id=(\d{8,20})/.exec(html)?.[1] ??
    null;
  const pixelScript = /connect\.facebook\.net\/[a-z_A-Z]+\/fbevents\.js/.test(html);

  const vendor = CONSENT_VENDORS.find(([, pattern]) => pattern.test(html))?.[0] ?? null;
  const consentMode = /gtag\(\s*['"]consent['"]\s*,\s*['"]default['"]/.test(html);

  return [
    { id: "gtm", found: Boolean(gtmId || gtmScript), evidence: gtmId },
    { id: "ga4", found: Boolean(ga4Script || (ga4Id && /gtag\(|google-analytics|googletagmanager/i.test(html))), evidence: ga4Id },
    { id: "meta_pixel", found: Boolean(pixelId || pixelScript), evidence: pixelId },
    {
      id: "consent",
      found: Boolean(vendor || consentMode),
      evidence: vendor ?? (consentMode ? "Consent Mode defaults" : null),
    },
  ];
}
