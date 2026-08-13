"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { CONSENT_EVENT } from "@/lib/consent";
import { track } from "@/lib/track";

/**
 * Fires page_view, and only page_view. Everything else is fired from the thing
 * that happened — a click handler on the button that was clicked — because an
 * event inferred from a route change is a guess, and this site does not ship
 * guesses.
 *
 * Note what is NOT used here: useSearchParams. It cannot be prerendered, so it
 * needs a Suspense boundary, and that boundary leaves a
 * BAILOUT_TO_CLIENT_SIDE_RENDERING marker in the HTML of every public page —
 * caught by the before/after diff. The query string is read from
 * `location.search` inside the effect instead, which runs in the browser where
 * it is available anyway. No page on this site renders differently for a
 * different query string, so nothing is lost.
 */
export function Tracker() {
  const pathname = usePathname();
  const lastUrl = useRef<string | null>(null);

  useEffect(() => {
    const url = location.pathname + location.search;

    // React runs effects twice in development, and a soft navigation back to
    // the same URL should not count twice either.
    if (lastUrl.current === url) return;
    lastUrl.current = url;

    track("page_view", { page_path: url });
  }, [pathname]);

  // A visitor who accepts after landing has already had their first page_view
  // recorded without a session. Re-firing it once, now that a session can
  // exist, is what stops every accepted visit starting on page two.
  useEffect(() => {
    const onConsent = () => track("page_view", { page_path: location.pathname });
    window.addEventListener(CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(CONSENT_EVENT, onConsent);
  }, []);

  return null;
}
