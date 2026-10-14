/**
 * The free tracking check: the parts that are pure functions.
 *
 * A visitor types a URL. The server route fetches that page's HTML, and, when
 * the page loads a Google Tag Manager container, fetches the container too.
 * This file says what is in each.
 *
 * TWO PLACES, KEPT APART IN THE RESULT. Most of what a well-built site runs is
 * not in its HTML at all: GA4, the Meta pixel and the rest are tags inside the
 * GTM container, and a server-side setup loads that container from the site's
 * own subdomain under a renamed script. A check that only read the HTML would
 * call the best-instrumented sites empty, which is exactly what the first
 * version of this file did. So every result says where it was found: in the
 * page source, or inside the container. "Not found" means not found in either
 * of those, never "not installed".
 *
 * The other half of this file is the gate on WHERE the server may fetch from.
 * A route that fetches a URL chosen by a stranger is a request forgery tool
 * unless every address is checked first; see isBlockedAddress.
 *
 * No I/O in here, so all of it is unit tested (tracking-check.test.ts). The
 * fetching is in app/api/tracking-check/route.ts.
 */

export const CHECK_IDS = [
  "gtm",
  "ga4",
  "google_ads",
  "meta_pixel",
  "tiktok",
  "linkedin",
  "clarity",
  "consent",
] as const;
export type CheckId = (typeof CHECK_IDS)[number];

/** Where something was seen. */
export type Source = "page" | "container";

export type CheckResult = {
  id: CheckId;
  found: boolean;
  /** Null when nothing was found. */
  source: Source | null;
  /** What matched, for the reader: an id like G-ABC123, or a vendor name. */
  evidence: string | null;
  /** A short extra fact, e.g. "custom loader on aa.example.com". */
  detail: string | null;
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
/* What is in a piece of text                                                   */
/* -------------------------------------------------------------------------- */

/** Consent tools recognisable from a script URL or a global. */
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

const GOOGLE_GTM_HOST = "www.googletagmanager.com";

/**
 * A GA4 measurement id. At least one digit, so library constants like
 * "G-SERVER" and words that happen to follow "G-" are not mistaken for one.
 */
const GA4_ID = /\bG-(?=[A-Z0-9]*\d)[A-Z0-9]{6,14}\b/g;
const ADS_ID = /\bAW-\d{6,12}\b/g;

function unique(values: Iterable<string>): string[] {
  return [...new Set(values)];
}

/** One thing found, before it is turned into a result row. */
export type Finding = { evidence: string | null; detail?: string | null };
export type Findings = Partial<Record<CheckId, Finding>>;

/** The patterns shared by the page and the container. */
function findInText(text: string): Findings {
  const out: Findings = {};

  const ga4 = unique(text.match(GA4_ID) ?? []);
  // A G- id counts only next to something that loads or configures Google's
  // tag, so a product code in an article does not.
  if (ga4.length && /gtag\(|\/gtag\/js\?id=G-|google-analytics|googletagmanager|__googtag|__gaawe/i.test(text)) {
    out.ga4 = { evidence: ga4.slice(0, 3).join(", ") };
    // gtag.js from the site's own domain is a first-party setup worth naming.
    const host = /https?:\/\/([a-z0-9.-]+)\/gtag\/js\?id=/i.exec(text)?.[1];
    if (host && host !== GOOGLE_GTM_HOST) out.ga4.detail = `gtag.js from ${host}`;
  }

  const ads = unique(text.match(ADS_ID) ?? []);
  if (ads.length) out.google_ads = { evidence: ads.slice(0, 3).join(", ") };

  const pixel =
    /fbq\(\s*['"]init['"]\s*,\s*['"]?(\d{8,20})/.exec(text)?.[1] ??
    /facebook\.com\/tr\?id=(\d{8,20})/.exec(text)?.[1] ??
    null;
  if (pixel || /connect\.facebook\.net\/[a-zA-Z_]+\/fbevents\.js/.test(text)) {
    out.meta_pixel = { evidence: pixel };
  }

  const tiktok = /ttq\.load\(\s*['"]([A-Z0-9]{15,30})['"]/.exec(text)?.[1] ?? null;
  if (tiktok || /analytics\.tiktok\.com\/i18n\/pixel/.test(text)) out.tiktok = { evidence: tiktok };

  const linkedin = /_linkedin_partner_id\s*=\s*["']?(\d{4,12})/.exec(text)?.[1] ?? null;
  if (linkedin || /snap\.licdn\.com\/li\.lms-analytics/.test(text)) out.linkedin = { evidence: linkedin };

  const clarity =
    /clarity\.ms\/tag\/([a-z0-9]{6,14})/i.exec(text)?.[1] ??
    /\(window,\s*document,\s*["']clarity["'],\s*["']script["'],\s*["']([a-z0-9]{6,14})["']\)/i.exec(text)?.[1] ??
    null;
  if (clarity || /clarity\.ms\/tag\//i.test(text)) out.clarity = { evidence: clarity };

  const vendor = CONSENT_VENDORS.find(([, pattern]) => pattern.test(text))?.[0] ?? null;
  const consentMode = /gtag\(\s*['"]consent['"]\s*,\s*['"]default['"]/.test(text);
  if (vendor || consentMode) out.consent = { evidence: vendor ?? "Consent Mode defaults" };

  return out;
}

/* -------------------------------------------------------------------------- */
/* The page                                                                     */
/* -------------------------------------------------------------------------- */

/** The GTM container a page loads, as far as its HTML says. */
export type ContainerRef = {
  /** "GTM-ABC123", or the bare id a custom loader uses ("WH7RQ8V6"). */
  id: string | null;
  /** The URL the container script is loaded from, when it can be built. */
  url: string | null;
  /** The host serving it. Not googletagmanager.com means a custom loader. */
  host: string | null;
  custom: boolean;
};

function absolute(raw: string, base: URL): URL | null {
  try {
    const url = new URL(raw.startsWith("//") ? `https:${raw}` : raw, base);
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

/**
 * Finds the GTM container a page loads.
 *
 * By the SHAPE of the snippet first, because the shape survives what a
 * server-side setup changes. Stape and similar services serve the container
 * from the site's own subdomain under a renamed script (/pf.js?c=,
 * /<random>.js?st=) and drop the GTM- prefix from the id. What they keep is
 * the snippet itself: the 'gtm.start' push, event 'gtm.js', and an IIFE
 * called with the layer name and the id as its last two arguments. The loader
 * URL is whatever string the snippet adds the id to.
 *
 * Then by a plain <script src> to a container URL, for pages that load it
 * without the snippet; then by a bare GTM- id beside googletagmanager.com.
 */
export function findContainer(source: string, page: URL): ContainerRef | null {
  // Frameworks that stream their HTML (Next.js among them) often carry the
  // snippet inside a JSON string, sometimes a JSON string inside another, with
  // its quotes and line breaks escaped once per level. Undo up to three levels
  // so one set of patterns reads all of them.
  let html = source;
  for (let level = 0; level < 3 && /\\["n/]/.test(html); level++) {
    html = html
      .replace(/\\\\/g, "\\")
      .replace(/\\n/g, "\n")
      .replace(/\\"/g, '"')
      .replace(/\\\//g, "/");
  }
  const snippet = /['"]gtm\.start['"]/.test(html) && /event\s*:\s*['"]gtm\.js['"]/.test(html);

  if (snippet) {
    // The last argument is the container id. Some loaders pass an encoded
    // query string there instead ("c77xs=HQtf...%3D"), which the loader URL
    // then carries as it is, so the argument is taken whole.
    const args =
      /\(\s*window\s*,\s*document\s*,\s*['"]script['"]\s*,\s*['"]([A-Za-z_$][\w$]*)['"]\s*,\s*['"]([^'"\s]{4,300})['"]\s*\)/.exec(
        html,
      );
    const raw = args?.[2] ?? /\bGTM-[A-Z0-9]{4,10}\b/.exec(html)?.[0] ?? null;
    const layer = args?.[1] ?? "dataLayer";
    const prefix = /\.src\s*=\s*['"]([^'"\s]+)['"]\s*\+\s*i\b/.exec(html)?.[1] ?? null;
    const readable = raw !== null && /^[A-Za-z0-9_-]{4,24}$/.test(raw);
    const id = readable ? raw : null;

    // The URL is built from whatever the snippet adds the argument to, so an
    // encoded argument still makes a fetchable URL even though it is not an
    // id worth showing anybody.
    let url: URL | null = null;
    if (raw && (readable || prefix)) {
      const base = prefix ?? `https://${GOOGLE_GTM_HOST}/gtm.js?id=`;
      url = absolute(`${base}${raw}${layer === "dataLayer" ? "" : `&l=${layer}`}`, page);
    }
    const host = url?.hostname ?? (prefix ? (absolute(prefix, page)?.hostname ?? null) : GOOGLE_GTM_HOST);
    return { id, url: url?.href ?? null, host, custom: Boolean(host && host !== GOOGLE_GTM_HOST) };
  }

  const tag =
    /<script[^>]+src=["']([^"']*(?:\/gtm\.js\?id=|\/pf\.js\?c=|\/[a-z0-9]{6,}\.js\?st=)[^"']*)["']/i.exec(html);
  if (tag) {
    const url = absolute(tag[1].replace(/&amp;/g, "&"), page);
    if (url) {
      const id = url.searchParams.get("id") ?? url.searchParams.get("c") ?? url.searchParams.get("st");
      return { id, url: url.href, host: url.hostname, custom: url.hostname !== GOOGLE_GTM_HOST };
    }
  }

  const bareId = /\bGTM-[A-Z0-9]{4,10}\b/.exec(html)?.[0];
  if (bareId && /googletagmanager\.com\/(?:gtm\.js|ns\.html)/i.test(html)) {
    return {
      id: bareId,
      url: `https://${GOOGLE_GTM_HOST}/gtm.js?id=${bareId}`,
      host: GOOGLE_GTM_HOST,
      custom: false,
    };
  }
  return null;
}

/** Everything that can be read from the page HTML alone. */
export function scanPage(html: string, page: URL): { findings: Findings; container: ContainerRef | null } {
  const findings = findInText(html);
  const container = findContainer(html, page);
  if (container) {
    findings.gtm = {
      evidence: container.id,
      detail: container.custom && container.host ? `custom loader on ${container.host}` : null,
    };
  }
  return { findings, container };
}

/* -------------------------------------------------------------------------- */
/* The container                                                                */
/* -------------------------------------------------------------------------- */

/**
 * A GTM container keeps custom HTML tags as escaped strings (\x3cscript\x3e,
 * \/). Unescaping first lets the same patterns match inside them.
 */
function unescapeJs(text: string): string {
  return text
    .replace(/\\x([0-9a-f]{2})/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\u([0-9a-f]{4})/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\\//g, "/")
    .replace(/\\"/g, '"');
}

type Macro = { function?: string; vtp_value?: unknown };
type Resource = { macros?: Macro[]; tags?: Record<string, unknown>[] };

/**
 * The container's own configuration: the JSON object assigned to `var data`.
 *
 * Extracted by matching braces rather than with a regular expression, because
 * the object is hundreds of kilobytes of nested JSON with braces inside its
 * strings. Null if it is not there or does not parse; the text scan still
 * runs either way.
 */
export function parseContainerData(js: string): Resource | null {
  const at = js.indexOf("var data =");
  if (at < 0) return null;
  const start = js.indexOf("{", at);
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let k = start; k < js.length; k++) {
    const c = js[k];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) {
      try {
        const data = JSON.parse(js.slice(start, k + 1)) as { resource?: Resource };
        return data.resource ?? null;
      } catch {
        return null;
      }
    }
  }
  return null;
}

/** A tag field's value, with ["macro", n] followed to a constant variable. */
function resolve(value: unknown, macros: Macro[]): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value) && value[0] === "macro" && typeof value[1] === "number") {
    const macro = macros[value[1]];
    const constant = macro?.vtp_value;
    if (macro?.function === "__c" && (typeof constant === "string" || typeof constant === "number")) {
      return String(constant);
    }
  }
  return null;
}

/** Every value set as ["map", "parameter", NAME, "parameterValue", VALUE] under a node. */
function settings(node: unknown, name: string, out: unknown[] = []): unknown[] {
  if (Array.isArray(node)) {
    const at = node.indexOf(name);
    if (node[0] === "map" && at > 0 && node[at - 1] === "parameter") {
      const v = node.indexOf("parameterValue");
      if (v > 0) out.push(node[v + 1]);
    }
    for (const child of node) settings(child, name, out);
  } else if (node && typeof node === "object") {
    for (const child of Object.values(node)) settings(child, name, out);
  }
  return out;
}

/**
 * What a container runs, read from its configuration.
 *
 * Tags are recognised by what they are configured with rather than by the name
 * of the template, because community templates have arbitrary names:
 *
 *   GA4          Google's own GA4 tags (__googtag, __gaawe, __gaawc)
 *   Google Ads   an AW- tag id, or a conversion or remarketing tag
 *   Meta         a pixel id field holding a 15 or 16 digit id
 *   TikTok       a pixel id in TikTok's 20-character format
 *
 * A GA4 id like "G-SERVER" is the placeholder server-side setups use to send
 * GA4 hits to their own server container instead of to Google. It is reported
 * as GA4 tags, with the server's host when the container names it.
 */
export function scanContainer(js: string): Findings {
  const out = findInText(unescapeJs(js));
  const resource = parseContainerData(js);

  // Consent Mode defaults set from inside the container, by a consent template.
  if (!out.consent && /setDefaultConsentState/.test(js)) {
    out.consent = { evidence: "Consent Mode defaults" };
  }

  if (!resource?.tags) return out;

  const macros = resource.macros ?? [];
  const ga4: string[] = [];
  const ads: string[] = [];
  const pixels: string[] = [];
  const tiktok: string[] = [];
  const servers: string[] = [];
  let gaTags = 0;

  for (const tag of resource.tags) {
    const fn = String(tag.function ?? "");
    const field = (key: string) => resolve(tag[key], macros);

    if (fn === "__googtag" || fn === "__gaawe" || fn === "__gaawc") {
      const id = field("vtp_tagId") ?? field("vtp_measurementIdOverride") ?? field("vtp_measurementId");
      if (id?.startsWith("AW-")) ads.push(id);
      else {
        gaTags++;
        if (id?.startsWith("G-")) ga4.push(id);
      }
    }
    if (fn === "__awct" || fn === "__sp") {
      const id = field("vtp_conversionId");
      if (id) ads.push(`AW-${id.replace(/^AW-/, "")}`);
      else ads.push("conversion tag");
    }

    for (const key of ["vtp_pixelIds", "vtp_pixelId", "vtp_pixel_id", "vtp_pixelCode"]) {
      const raw = tag[key];
      if (raw === undefined) continue;
      // A list is ["list", a, b]; a single value is a string or a macro.
      const values = Array.isArray(raw) && raw[0] === "list" ? raw.slice(1) : [raw];
      for (const value of values) {
        for (const id of String(resolve(value, macros) ?? "").split(/[,\s]+/)) {
          if (/^\d{15,16}$/.test(id)) pixels.push(id);
          else if (/^[A-Z0-9]{20}$/.test(id)) tiktok.push(id);
        }
      }
    }

    for (const name of ["server_container_url", "transport_url"]) {
      for (const value of settings(tag, name)) {
        const url = resolve(value, macros);
        if (url && /^https?:\/\//.test(url)) servers.push(url);
      }
    }
  }

  let server: string | null = null;
  try {
    server = servers.length ? new URL(servers[0]).hostname : null;
  } catch {
    server = null;
  }

  if (gaTags || ga4.length) {
    const real = unique(ga4.filter((id) => /\d/.test(id)));
    out.ga4 = {
      evidence: real.length ? real.slice(0, 3).join(", ") : (out.ga4?.evidence ?? "GA4 tags"),
      detail: server ? `sent to a server container on ${server}` : (out.ga4?.detail ?? null),
    };
  }
  if (ads.length) {
    const known = out.google_ads?.evidence ? out.google_ads.evidence.split(", ") : [];
    out.google_ads = { evidence: unique([...ads, ...known]).slice(0, 3).join(", ") };
  }
  if (pixels.length) out.meta_pixel = { evidence: unique(pixels).slice(0, 3).join(", ") };
  if (tiktok.length) out.tiktok = { evidence: unique(tiktok).slice(0, 3).join(", ") };

  return out;
}

/* -------------------------------------------------------------------------- */
/* The answer                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The result list the visitor sees. A thing found in the page is reported from
 * the page; a thing found only in the container is reported from the
 * container. The page wins a tie, because "it is right there in your HTML" is
 * the plainer statement.
 */
export function combine(page: Findings, container: Findings | null): CheckResult[] {
  return CHECK_IDS.map((id): CheckResult => {
    const inPage = page[id];
    if (inPage) {
      return { id, found: true, source: "page", evidence: inPage.evidence, detail: inPage.detail ?? null };
    }
    const inContainer = container?.[id];
    if (inContainer) {
      return {
        id,
        found: true,
        source: "container",
        evidence: inContainer.evidence,
        detail: inContainer.detail ?? null,
      };
    }
    return { id, found: false, source: null, evidence: null, detail: null };
  });
}

/** The page alone, with no container read. */
export function detect(html: string, page = new URL("https://example.com/")): CheckResult[] {
  return combine(scanPage(html, page).findings, null);
}
