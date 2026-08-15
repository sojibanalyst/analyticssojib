import type { Database } from "@/lib/supabase/types";

/**
 * Parsing and validation for the collector. Kept apart from the route handler
 * so it can be reasoned about — and tested — without a request object.
 *
 * Deliberately NOT marked `server-only`, unlike lib/supabase/admin.ts. There
 * is nothing secret in here: it is string parsing, and the guard would only
 * stop `node --test` from importing it. The secret lives in the route handler
 * that calls getAdminClient(), and that file is where the guard belongs.
 */

export const SESSION_COOKIE = "sf_sid";

/** 30 minutes of inactivity ends a session, matching GA4's definition. */
export const SESSION_MAX_AGE = 30 * 60;

type DeviceType = Database["public"]["Enums"]["device_type"];

/** Names are snake_case and short. Anything else is not ours. */
const EVENT_NAME = /^[a-z][a-z0-9_]{0,39}$/;

const MAX_PARAM_KEYS = 25;
const MAX_STRING = 512;
const MAX_PATH = 2048;

export type Envelope = {
  event_name: string;
  event_id: string;
  occurred_at: string;
  page_path: string | null;
  referrer: string | null;
  params: Record<string, string | number | boolean | null>;
  consent: Record<string, string>;
};

/** Shape mirrors lib/consent.ts. Not imported: that module is "use client". */
const NOT_ASKED: Record<string, string> = { status: "not_asked" };

function str(value: unknown, max = MAX_STRING): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

/**
 * Turns whatever arrived into an Envelope, or null.
 *
 * This is a public, unauthenticated endpoint, so nothing here trusts its
 * input: every string is length-capped, the parameter bag is capped in both
 * key count and value size, and anything unrecognised is dropped rather than
 * stored. The cap is what stops a single POST writing a megabyte of jsonb.
 */
export function parseEnvelope(input: unknown): Envelope | null {
  if (!input || typeof input !== "object") return null;
  const body = input as Record<string, unknown>;

  const eventName = str(body.event_name, 40);
  if (!eventName || !EVENT_NAME.test(eventName)) return null;

  const eventId = str(body.event_id, 100);
  if (!eventId) return null;

  // A clock-skewed or forged timestamp would corrupt every time-based report,
  // so an unparseable one falls back to now rather than being trusted.
  const occurredRaw = str(body.occurred_at, 40);
  const occurred = occurredRaw ? new Date(occurredRaw) : new Date();
  const occurredAt = Number.isNaN(occurred.getTime())
    ? new Date().toISOString()
    : occurred.toISOString();

  const params: Envelope["params"] = {};
  if (body.params && typeof body.params === "object" && !Array.isArray(body.params)) {
    for (const [key, value] of Object.entries(body.params)) {
      if (Object.keys(params).length >= MAX_PARAM_KEYS) break;
      if (!EVENT_NAME.test(key)) continue;
      if (typeof value === "string") params[key] = value.slice(0, MAX_STRING);
      else if (typeof value === "number" && Number.isFinite(value)) params[key] = value;
      else if (typeof value === "boolean" || value === null) params[key] = value;
    }
  }

  // Consent is recorded exactly as the browser reported it, filtered to the
  // signals we know. Storing it per event is what lets a later question —
  // "was this conversion collected with permission?" — be answered from the
  // row rather than from memory.
  //
  // With no banner on the site, every event arrives as not_asked, and that is
  // what gets stored. An empty object would have been the lazy default and it
  // would have been a lie by omission: a row with no consent data is
  // indistinguishable from a row written before consent was recorded at all.
  // The value has to say which of the three it is.
  const consent: Record<string, string> = {};
  if (body.consent && typeof body.consent === "object") {
    for (const [key, value] of Object.entries(body.consent as Record<string, unknown>)) {
      if (key === "status") {
        if (value === "asked" || value === "not_asked") consent.status = value;
        continue;
      }
      if (EVENT_NAME.test(key) && (value === "granted" || value === "denied")) {
        consent[key] = value;
      }
    }
  }

  // A payload carrying signals but no status came from a client older than
  // this change; it did ask somebody. One with neither says nothing, and
  // nothing means nobody was asked.
  if (!consent.status) {
    consent.status = Object.keys(consent).length > 0 ? "asked" : "not_asked";
  }
  // Signals arriving alongside not_asked contradict each other, and the safe
  // reading of a contradiction is the one that grants nothing.
  const normalised =
    consent.status === "not_asked" ? { ...NOT_ASKED } : consent;

  return {
    event_name: eventName,
    event_id: eventId,
    occurred_at: occurredAt,
    page_path: str(body.page_path, MAX_PATH),
    referrer: str(body.referrer, MAX_PATH),
    params,
    consent: normalised,
  };
}

export type Attribution = {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  term: string | null;
  content: string | null;
  gclid: string | null;
  fbclid: string | null;
  ttclid: string | null;
  msclkid: string | null;
  /**
   * True when nothing in this request said where the visitor came from, so
   * `source` is the "direct" fallback rather than an observation.
   *
   * The caller needs this and cannot infer it: `source` is never null, so
   * `if (attribution.source)` is always true. Testing that instead let a
   * plain second pageview overwrite a session's last touch with "direct" —
   * which is exactly the campaign erasure this field exists to prevent.
   */
  isDirect: boolean;
};

const EMPTY: Attribution = {
  source: null,
  medium: null,
  campaign: null,
  term: null,
  content: null,
  gclid: null,
  fbclid: null,
  ttclid: null,
  msclkid: null,
  isDirect: false,
};

/** Referrer hosts that are search rather than a plain link. */
const SEARCH_ENGINES = /(^|\.)(google|bing|duckduckgo|yahoo|ecosia|brave|yandex)\./i;
const SOCIAL = /(^|\.)(facebook|instagram|linkedin|t|twitter|x|reddit|tiktok|youtube)\.(com|co)$/i;

/**
 * Works out where a visit came from.
 *
 * Explicit UTM parameters always win — if someone tagged the link, that is the
 * answer. Only when there are none does the referrer get interpreted, and a
 * click id alone is enough to name the source, because an ad click with a
 * stripped utm_source is still an ad click.
 */
export function attributionFrom(
  pagePath: string | null,
  referrer: string | null,
): Attribution {
  const result: Attribution = { ...EMPTY };

  let params: URLSearchParams | null = null;
  if (pagePath) {
    const q = pagePath.indexOf("?");
    if (q !== -1) params = new URLSearchParams(pagePath.slice(q + 1));
  }

  if (params) {
    result.source = str(params.get("utm_source"), 120);
    result.medium = str(params.get("utm_medium"), 120);
    result.campaign = str(params.get("utm_campaign"), 200);
    result.term = str(params.get("utm_term"), 200);
    result.content = str(params.get("utm_content"), 200);
    result.gclid = str(params.get("gclid"), 200);
    result.fbclid = str(params.get("fbclid"), 200);
    result.ttclid = str(params.get("ttclid"), 200);
    result.msclkid = str(params.get("msclkid"), 200);
  }

  if (!result.source && result.gclid) {
    result.source = "google";
    result.medium = result.medium ?? "cpc";
  }
  if (!result.source && result.fbclid) {
    result.source = "facebook";
    result.medium = result.medium ?? "paid_social";
  }
  if (!result.source && result.ttclid) {
    result.source = "tiktok";
    result.medium = result.medium ?? "paid_social";
  }
  if (!result.source && result.msclkid) {
    result.source = "bing";
    result.medium = result.medium ?? "cpc";
  }

  if (!result.source && referrer) {
    try {
      const host = new URL(referrer).hostname.replace(/^www\./, "");
      result.source = host;
      result.medium = SEARCH_ENGINES.test(host)
        ? "organic"
        : SOCIAL.test(host)
          ? "social"
          : "referral";
    } catch {
      // Not a URL. Leave it as direct rather than inventing a source.
    }
  }

  // No UTM, no click id, no referrer. "direct" is a real answer, and leaving
  // it null would make every direct visit look like missing data — but it is
  // an absence of evidence, not evidence, so it is flagged as such.
  if (!result.source) {
    result.source = "direct";
    result.medium = "none";
    result.isDirect = true;
  }

  return result;
}

/**
 * Device class from the user agent.
 *
 * Deliberately coarse. UA parsing is a losing game and the console only ever
 * groups by these five buckets; a full parser would be more code, more wrong,
 * and no more useful. Bots are separated because they otherwise inflate every
 * session count on a site with no traffic yet.
 */
export function deviceTypeFrom(userAgent: string): DeviceType {
  const ua = userAgent.toLowerCase();
  if (!ua) return "unknown";
  if (/bot|crawler|spider|crawling|headless|lighthouse|preview|monitor/.test(ua)) {
    return "bot";
  }
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|android|blackberry|iemobile|opera mini/.test(ua)) return "mobile";
  return "desktop";
}
