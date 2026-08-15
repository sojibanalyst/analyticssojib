"use client";

/**
 * Consent state. No UI.
 *
 * The banner is gone — deliberately and permanently, not hidden behind a flag.
 * What stays is the STATE: the seven Consent Mode v2 signals, the cookie they
 * live in, the update call into gtag, and a third value that the binary
 * granted/denied pair could not express.
 *
 * `not_asked` is the point of keeping any of this. It is not "denied": denied
 * means a person was shown a choice and said no, and not_asked means nobody
 * ever asked them. Collapsing the two would make /admin/events claim a refusal
 * that never happened, and would make a later consent-rate figure meaningless.
 * Every event collected from now on carries not_asked, and says so on screen.
 *
 * Nothing here writes the cookie any more. A CMP is what will — see the note
 * at the bottom of this file.
 */

/**
 * The seven signals Google defines. `security_storage` is not a choice — it
 * covers things like fraud prevention that a site cannot function without —
 * so it is always granted.
 */
export type ConsentSignal =
  | "ad_storage"
  | "ad_user_data"
  | "ad_personalization"
  | "analytics_storage"
  | "functionality_storage"
  | "personalization_storage"
  | "security_storage";

export type ConsentValue = "granted" | "denied";
export type ConsentState = Record<ConsentSignal, ConsentValue>;

/**
 * What gets stored on an event or a session.
 *
 * The signal keys are ABSENT when nobody was asked, which is what keeps every
 * existing reader correct without being rewritten: `consent.analytics_storage
 * === "granted"` was false for a refusal and is false for a never-asked, and
 * "granted" remains the only thing that unlocks anything.
 */
export type ConsentRecord =
  | ({ status: "asked" } & ConsentState)
  | { status: "not_asked" };

/** Bumped if the meaning of a signal changes; a new key re-asks everyone. */
export const CONSENT_COOKIE = "sf_consent_1";
export const CONSENT_EVENT = "sf-consent-change";
const MAX_AGE_DAYS = 180;

export const NOT_ASKED: ConsentRecord = { status: "not_asked" };

export const DENIED: ConsentState = {
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
  analytics_storage: "denied",
  functionality_storage: "denied",
  personalization_storage: "denied",
  security_storage: "granted",
};

export const GRANTED: ConsentState = {
  ad_storage: "granted",
  ad_user_data: "granted",
  ad_personalization: "granted",
  analytics_storage: "granted",
  functionality_storage: "granted",
  personalization_storage: "granted",
  security_storage: "granted",
};

/**
 * Read the stored choice, or null if there is not one.
 *
 * With no banner this returns null on every visit today. It is still here, and
 * still correct, because the cookie is the interface: a CMP that writes
 * sf_consent_1 in this shape is understood by the tracker and by the gtag
 * bootstrap in app/layout.tsx without either of them changing.
 */
export function readConsent(): ConsentState | null {
  if (typeof document === "undefined") return null;

  const match = document.cookie.match(
    new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]*)`),
  );
  if (!match) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(match[1])) as Partial<ConsentState>;
    // Merge over DENIED so a cookie written by an older version, missing a
    // signal added since, denies that signal rather than leaving it undefined.
    return { ...DENIED, ...parsed, security_storage: "granted" };
  } catch {
    return null;
  }
}

/**
 * What the collector should record for an event happening right now.
 *
 * No cookie means not_asked, NOT denied. That is the whole reason this
 * function did not simply get deleted with the banner.
 */
export function currentConsent(): ConsentRecord {
  const stored = readConsent();
  return stored ? { status: "asked", ...stored } : NOT_ASKED;
}

/**
 * Store a choice and tell Google about it.
 *
 * Nothing calls this today. It is the entry point a CMP wraps: call it with a
 * ConsentState and the cookie, the gtag update and the dataLayer event all
 * happen together, in the order Google requires.
 *
 * The cookie is deliberately not HttpOnly: the tracker reads it in the
 * browser, and it holds a preference, not an identifier.
 */
export function setConsent(state: ConsentState): void {
  const value = encodeURIComponent(JSON.stringify(state));
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie =
    `${CONSENT_COOKIE}=${value}; Path=/; Max-Age=${MAX_AGE_DAYS * 86400}` +
    `; SameSite=Lax${secure}`;

  // 'update', not 'default': the defaults were declared before GTM loaded,
  // and update is what unblocks tags mid-session.
  //
  // Through window.gtag, defined by the bootstrap in app/layout.tsx, because
  // Google's tag reads the array-LIKE `arguments` object that gtag() pushes.
  // Pushing a plain array here would look right and do nothing.
  window.gtag?.("consent", "update", state);

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: "consent_update", consent_state: state });

  window.dispatchEvent(new Event(CONSENT_EVENT));
}

/* --------------------------------------------------------------------------
   Putting a CMP back in

   Four things exist and are already wired; a CMP has to meet them, and needs
   to change nothing else:

   1. gtag('consent','default',…) is declared in app/layout.tsx ABOVE the GTM
      snippet, all denied except security_storage, with wait_for_update: 500.
      A CMP must not re-declare defaults after the container loads.
   2. setConsent(state) above is the write path — cookie, gtag update and
      dataLayer event in one call. Point the CMP's accept/reject handlers at
      it, or have the CMP write sf_consent_1 in the same JSON shape.
   3. lib/track.ts stamps currentConsent() onto every event, so rows switch
      from not_asked to a real answer the moment the cookie exists. No
      collector or schema change.
   4. The CONSENT_EVENT dispatch is what components/Tracker.tsx listens for to
      re-fire a page_view once permission arrives — the pageview that was
      collected without a session id gets a counterpart that has one.
   -------------------------------------------------------------------------- */
