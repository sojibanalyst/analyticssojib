/**
 * Typed dataLayer helper.
 *
 * Nothing calls this yet — the tracking plan is a separate piece of work.
 * It is here so that when events are wired up there is one obvious place to
 * push from, and so no component has to touch `window.dataLayer` directly.
 */

export type GtmEventParams = Record<
  string,
  string | number | boolean | null | undefined | Record<string, unknown> | unknown[]
>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    /**
     * Defined by the consent bootstrap in app/layout.tsx, before GTM loads.
     * Only consent calls go through it — ordinary events use pushEvent below.
     */
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * The container id is NOT read here any more.
 *
 * It used to be `process.env.NEXT_PUBLIC_GTM_ID`, which Next inlines into the
 * bundle at build time — so the container could only be changed by
 * redeploying, whatever a settings form claimed. It now comes from
 * lib/settings at request time, database first and the env var as a fallback.
 *
 * pushEvent below is unaffected: it writes to window.dataLayer, which exists
 * whether or not a container is loaded, so events queue harmlessly until one
 * is.
 */

/**
 * Push an event onto the dataLayer. Safely no-ops during SSR, or when GTM is
 * not configured, or before the container has created `window.dataLayer`.
 */
export function pushEvent(name: string, params: GtmEventParams = {}): void {
  if (typeof window === "undefined") return;
  if (!Array.isArray(window.dataLayer)) return;
  window.dataLayer.push({ event: name, ...params });
}

// Example of the intended call pattern — deliberately left commented out.
// Wire real events here once the tracking plan is agreed:
//
// pushEvent("book_call_click", { placement: "hero", cta: "primary" });
