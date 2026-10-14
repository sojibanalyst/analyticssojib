"use client";

import { currentConsent } from "@/lib/consent";
import { pushEvent } from "@/lib/gtm";

/**
 * The browser half of the collector.
 *
 * One idea holds the whole thing together: **every event gets exactly one
 * event_id, generated once, and both paths carry it.** The dataLayer push and
 * the POST to /api/collect use the same string, so when the server later
 * forwards that event to Meta or Google alongside the browser pixel, the
 * platform recognises the two as one conversion instead of two. Generate the
 * id twice and deduplication is silently gone — the numbers just come out
 * double, which is the exact failure this site sells fixing.
 */
export const COLLECT_ENDPOINT = "/api/collect";

export type TrackParams = Record<string, string | number | boolean | null>;

function newEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Safari < 15.4 and any non-secure context. Collision risk is irrelevant at
  // this volume; having an id at all is what matters.
  return `e_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/* --------------------------------------------------------------------------
   Own traffic

   Somebody signed in to the console is the owner, and the owner's clicks are
   not visitors. The console itself is already outside the tracker (it is not
   mounted in the (admin) group); this covers the other half, the owner
   browsing the public site in the same browser.

   The test is the Supabase auth cookie, which @supabase/ssr sets readable by
   script. It is a presence check and nothing more: the value is never read,
   and nothing is unlocked by it. A stale cookie after sign-out only means a
   few of the owner's own events go uncounted, which is the safe direction.
   -------------------------------------------------------------------------- */
const ADMIN_COOKIE = /(?:^|; )sb-[^=;]+-auth-token(?:\.\d+)?=/;

export function isOwnTraffic(): boolean {
  return typeof document !== "undefined" && ADMIN_COOKIE.test(document.cookie);
}

/* --------------------------------------------------------------------------
   What this visit has sent

   A plain in-memory list of the events this page has fired, for the "See what
   I'm tracking about you" drawer. It lives in the tab and nowhere else: it is
   not written to storage and is gone on reload, because it is a mirror of
   what was sent, not a second copy of it.
   -------------------------------------------------------------------------- */
export type SentEvent = {
  id: string;
  name: string;
  at: number;
  path: string;
  params: TrackParams;
  /** False when the event was held back as the owner's own traffic. */
  sent: boolean;
};

const MAX_LOG = 100;
let log: SentEvent[] = [];
const listeners = new Set<() => void>();

function record(entry: SentEvent) {
  // A new array each time: useSyncExternalStore compares by identity.
  log = [...log, entry].slice(-MAX_LOG);
  for (const listener of listeners) listener();
}

export function getSentEvents(): SentEvent[] {
  return log;
}

export function subscribeSentEvents(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Fire an event.
 *
 * Sends on both paths and never throws: a tracking call that can break a click
 * handler is worse than a lost event.
 */
export function track(name: string, params: TrackParams = {}): string {
  const eventId = newEventId();

  try {
    const own = isOwnTraffic();

    record({
      id: eventId,
      name,
      at: Date.now(),
      path: location.pathname,
      params,
      sent: !own,
    });

    if (own) return eventId;

    const consent = currentConsent();

    // Browser path — GTM decides what to do with it under Consent Mode.
    pushEvent(name, { ...params, event_id: eventId });

    const body = JSON.stringify({
      event_name: name,
      event_id: eventId,
      occurred_at: new Date().toISOString(),
      page_path: location.pathname + location.search,
      referrer: document.referrer || null,
      title: document.title,
      screen_w: window.innerWidth,
      params,
      consent,
    });

    // sendBeacon survives the page being closed, which is exactly when the
    // last and most interesting event of a visit fires. It is fire-and-forget
    // by design; fetch with keepalive is the fallback where it is missing.
    const blob = new Blob([body], { type: "application/json" });
    if (!navigator.sendBeacon?.(COLLECT_ENDPOINT, blob)) {
      void fetch(COLLECT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Swallowed on purpose. See above.
  }

  return eventId;
}
