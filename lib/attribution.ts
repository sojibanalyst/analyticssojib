/**
 * Where an enquiry came from, read from the request rather than from the page.
 *
 * WHY THIS EXISTS SEPARATELY FROM SESSIONS
 *
 * Attribution used to be copied onto a lead from public.sessions. A session is
 * only created when analytics_storage is granted; there is no consent
 * interface; so no session was ever created and every lead arrived with every
 * attribution column null. First touch read "—" and always would have, and
 * /admin/offline-conversions could never satisfy its own requirement of
 * "google_ads · needs gclid".
 *
 * Attribution is now captured on its own, from the URL and the Referer header,
 * with no dependency on sessions or consent state. When consent comes back,
 * sessions resume and the two agree rather than competing: submit_lead prefers
 * this and falls back to the session.
 *
 * SERVER-SIDE, NOT FROM JAVASCRIPT
 *
 * Nothing here runs in the browser and nothing is posted back with the form.
 * The Leads page makes the argument better than this comment can: "a page that
 * could name its own source could credit any campaign it liked."
 *
 * Pure functions only — no cookies API, no headers, no clock beyond what is
 * passed in — so the parsing can be tested without a request.
 */

/** One observation of where somebody came from. */
export type Touch = {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  term: string | null;
  content: string | null;
  gclid: string | null;
  /**
   * Google's iOS web-to-app click ids. Three separate parameters, deliberately
   * three separate fields: wbraid and gbraid arrive on journeys gclid never
   * sees, and an offline conversion uploaded against the wrong one is
   * rejected. Collapsing them into gclid would lose the upload and look like
   * it had worked.
   */
  wbraid: string | null;
  gbraid: string | null;
  fbclid: string | null;
  ttclid: string | null;
  msclkid: string | null;
  li_fat_id: string | null;
  landing_page: string | null;
  referrer: string | null;
};

export type AttributionRecord = {
  first: Touch;
  last: Touch;
  first_seen_at: string;
  /**
   * captured — parameters or an external referrer were seen.
   * direct    — the first request was observed and carried nothing.
   * unknown   — nothing was ever observed. A capture failure, and NOT direct.
   *
   * The third value is the point. A lead with no cookie is not a person who
   * typed the address in; it is a person whose attribution we failed to
   * record, and reporting that as direct traffic is the exact mistake this
   * site sells fixing.
   */
  status: "captured" | "direct" | "unknown";
};

export const ATTRIBUTION_COOKIE = "sf_attr_1";

/** 90 days. Longer than a sales cycle here, shorter than a year of memory. */
export const ATTRIBUTION_MAX_AGE = 90 * 24 * 60 * 60;

const MAX_VALUE = 200;
const MAX_PATH = 2048;

const EMPTY_TOUCH: Touch = {
  source: null,
  medium: null,
  campaign: null,
  term: null,
  content: null,
  gclid: null,
  wbraid: null,
  gbraid: null,
  fbclid: null,
  ttclid: null,
  msclkid: null,
  li_fat_id: null,
  landing_page: null,
  referrer: null,
};

function clean(value: string | null, max = MAX_VALUE): string | null {
  if (!value) return null;
  const trimmed = value.trim().slice(0, max);
  return trimmed || null;
}

/** Referrer hosts that are search rather than a plain link. */
const SEARCH_ENGINES = /(^|\.)(google|bing|duckduckgo|yahoo|ecosia|brave|yandex)\./i;
const SOCIAL = /(^|\.)(facebook|instagram|linkedin|t|twitter|x|reddit|tiktok|youtube)\.(com|co)$/i;

/**
 * One request → one touch.
 *
 * Explicit UTM parameters win: if somebody tagged the link, that is the answer.
 * A click id alone names the source, because an ad click with a stripped
 * utm_source is still an ad click. Only then is the referrer interpreted.
 */
export function touchFromRequest(
  url: URL,
  referrer: string | null,
  selfHost: string,
): Touch {
  const q = url.searchParams;
  const touch: Touch = {
    ...EMPTY_TOUCH,
    source: clean(q.get("utm_source")),
    medium: clean(q.get("utm_medium")),
    campaign: clean(q.get("utm_campaign")),
    term: clean(q.get("utm_term")),
    content: clean(q.get("utm_content")),
    gclid: clean(q.get("gclid")),
    wbraid: clean(q.get("wbraid")),
    gbraid: clean(q.get("gbraid")),
    fbclid: clean(q.get("fbclid")),
    ttclid: clean(q.get("ttclid")),
    msclkid: clean(q.get("msclkid")),
    li_fat_id: clean(q.get("li_fat_id")),
    landing_page: clean(url.pathname + url.search, MAX_PATH),
    referrer: clean(referrer, MAX_PATH),
  };

  if (!touch.source && touch.gclid) {
    touch.source = "google";
    touch.medium = touch.medium ?? "cpc";
  }
  // wbraid and gbraid are Google Ads clicks that arrived without a gclid.
  if (!touch.source && (touch.wbraid || touch.gbraid)) {
    touch.source = "google";
    touch.medium = touch.medium ?? "cpc";
  }
  if (!touch.source && touch.fbclid) {
    touch.source = "facebook";
    touch.medium = touch.medium ?? "paid_social";
  }
  if (!touch.source && touch.ttclid) {
    touch.source = "tiktok";
    touch.medium = touch.medium ?? "paid_social";
  }
  if (!touch.source && touch.msclkid) {
    touch.source = "bing";
    touch.medium = touch.medium ?? "cpc";
  }
  if (!touch.source && touch.li_fat_id) {
    touch.source = "linkedin";
    touch.medium = touch.medium ?? "paid_social";
  }

  if (!touch.source && referrer) {
    try {
      const host = new URL(referrer).hostname.replace(/^www\./, "");
      // A referrer from this site is navigation, not a source.
      if (host !== selfHost.replace(/^www\./, "")) {
        touch.source = host;
        touch.medium = SEARCH_ENGINES.test(host)
          ? "organic"
          : SOCIAL.test(host)
            ? "social"
            : "referral";
      }
    } catch {
      // Not a URL. Not a source either.
    }
  }

  return touch;
}

/** Whether a touch observed anything at all worth recording. */
export function isMeaningful(touch: Touch): boolean {
  return Boolean(
    touch.source ||
      touch.medium ||
      touch.campaign ||
      touch.gclid ||
      touch.wbraid ||
      touch.gbraid ||
      touch.fbclid ||
      touch.ttclid ||
      touch.msclkid ||
      touch.li_fat_id,
  );
}

/**
 * Fold a new observation into what is already known.
 *
 * First touch is written once and never overwritten — it is the campaign that
 * discovered them. Last touch is replaced only when the new request actually
 * says something: an internal click from one page to another is not a new
 * source, and letting it overwrite last touch would erase the campaign that
 * found them on their second pageview. That exact bug has already happened
 * once in this codebase, on sessions.
 */
export function mergeTouch(
  existing: AttributionRecord | null,
  incoming: Touch,
  now: string,
): AttributionRecord {
  const meaningful = isMeaningful(incoming);

  if (!existing) {
    return {
      first: incoming,
      last: incoming,
      first_seen_at: now,
      status: meaningful ? "captured" : "direct",
    };
  }

  if (!meaningful) return existing;

  return {
    first: existing.status === "direct" ? incoming : existing.first,
    last: incoming,
    first_seen_at: existing.first_seen_at,
    // A visit that started direct and later arrived on a campaign is captured
    // from that point: the first meaningful touch becomes the first touch,
    // because "direct" was the absence of one rather than an answer.
    status: "captured",
  };
}

export function serialiseAttribution(record: AttributionRecord): string {
  return encodeURIComponent(JSON.stringify(record));
}

/** Never throws: a malformed cookie is no attribution, not an error page. */
export function parseAttribution(raw: string | null | undefined): AttributionRecord | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<AttributionRecord>;
    if (!parsed || typeof parsed !== "object" || !parsed.first || !parsed.last) return null;
    return {
      first: { ...EMPTY_TOUCH, ...parsed.first },
      last: { ...EMPTY_TOUCH, ...parsed.last },
      first_seen_at: parsed.first_seen_at ?? new Date().toISOString(),
      status:
        parsed.status === "captured" || parsed.status === "direct" ? parsed.status : "unknown",
    };
  } catch {
    return null;
  }
}

/**
 * What submit_lead receives when there is no cookie at all.
 *
 * status "unknown", never "direct" — see the type. This is a capture failure
 * and the Leads page says so rather than filing it as organic.
 */
export const UNKNOWN_ATTRIBUTION: AttributionRecord = {
  first: EMPTY_TOUCH,
  last: EMPTY_TOUCH,
  first_seen_at: "",
  status: "unknown",
};
