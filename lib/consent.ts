"use client";

import { useSyncExternalStore } from "react";

/**
 * Consent Mode v2.
 *
 * The seven signals Google defines. `security_storage` is not a choice — it
 * covers things like fraud prevention that a site cannot function without —
 * so it is always granted and never shown to the visitor.
 *
 * Everything else starts DENIED. That is the whole point of Consent Mode v2:
 * tags load, but they send cookieless pings until the visitor says otherwise,
 * instead of either firing without permission or not firing at all.
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

/** Bumped if the meaning of a signal changes; a new key re-asks everyone. */
export const CONSENT_COOKIE = "sf_consent_1";
export const CONSENT_EVENT = "sf-consent-change";
const MAX_AGE_DAYS = 180;

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
 * Read the stored choice, or null if the visitor has not made one.
 *
 * null is not the same as DENIED, and the difference matters: null means "ask
 * them", DENIED means "they said no". Collapsing the two would re-ask someone
 * who already declined on every visit.
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

/** What the collector and the tags should assume right now. */
export function currentConsent(): ConsentState {
  return readConsent() ?? DENIED;
}

export function hasChosen(): boolean {
  return readConsent() !== null;
}

/**
 * Store a choice and tell Google about it.
 *
 * The cookie is deliberately not HttpOnly: the banner and the tracker both
 * read it in the browser, and it holds a preference, not an identifier.
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

function subscribe(onChange: () => void) {
  window.addEventListener(CONSENT_EVENT, onChange);
  return () => window.removeEventListener(CONSENT_EVENT, onChange);
}

/**
 * The server always renders as "not chosen yet" and the client corrects on
 * mount. The banner is hidden until mount for that reason — rendering it in
 * the prerendered HTML would show it for a frame to people who already
 * answered.
 */
export function useConsent(): ConsentState | null {
  return useSyncExternalStore(
    subscribe,
    readConsent,
    () => null,
  );
}

export function useHasChosen(): boolean {
  return useSyncExternalStore(
    subscribe,
    hasChosen,
    () => true,
  );
}
