"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { CONSENT_EVENT } from "@/lib/consent";
import { track, type TrackParams } from "@/lib/track";

/**
 * Every event the public site fires, from one place.
 *
 * page_view comes from the route. Everything else comes from the thing that
 * happened: a click, a scroll past a mark, a first keystroke in the form. No
 * component calls track() for a click of its own. An element says what it is
 * in its markup and the one listener here does the rest:
 *
 *   <a data-track-event="cta_click" data-track-cta-id="see-how-i-work">
 *
 * `data-track-event` names the event. Any other `data-track-*` attribute
 * becomes a parameter, with its name turned to snake_case, so
 * data-track-cta-id is cta_id. `section` is added automatically: the id of
 * the nearest <section>, or "header" or "footer".
 *
 * The attribute is data-track-EVENT, not data-track. A bare [data-track] is
 * already a CSS hook for the carousel tracks in app/globals.css.
 *
 * Two kinds of click need no attribute at all, because what they are is
 * already in the markup: a link to wa.me is whatsapp_click, and anything
 * styled as a button is cta_click. A marked element always wins over both.
 *
 * Note what is NOT used here: useSearchParams. It cannot be prerendered, so it
 * needs a Suspense boundary, and that boundary leaves a
 * BAILOUT_TO_CLIENT_SIDE_RENDERING marker in the HTML of every public page.
 * The query string is read from `location.search` inside the effect instead.
 */

const SCROLL_MARKS = [25, 50, 75, 90] as const;

/** The nearest named region, for the `section` parameter. */
function sectionOf(el: Element): string {
  const section = el.closest("section[id]");
  if (section) return section.id;
  if (el.closest(".hero")) return "hero";
  if (el.closest("header, .mobile-menu")) return "header";
  if (el.closest("footer")) return "footer";
  if (el.closest(".dock")) return "dock";
  if (el.closest(".announce")) return "announcement";
  return "page";
}

/** "BOOK A FREE 30-MIN CALL →" becomes "book-a-free-30-min-call". */
function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** data-track-cta-id="x" arrives as dataset.trackCtaId; this returns cta_id. */
function paramsFrom(el: HTMLElement): TrackParams {
  const params: TrackParams = {};
  for (const [key, value] of Object.entries(el.dataset)) {
    if (!key.startsWith("track") || key === "trackEvent" || value === undefined) continue;
    const name = key
      .slice(5)
      .replace(/[A-Z]/g, (c, i: number) => (i ? "_" : "") + c.toLowerCase());
    if (name) params[name] = value;
  }
  return params;
}

export function Tracker() {
  const pathname = usePathname();
  const lastUrl = useRef<string | null>(null);

  // page_view, and case_study_view on a case page.
  useEffect(() => {
    const url = location.pathname + location.search;

    // React runs effects twice in development, and a soft navigation back to
    // the same URL should not count twice either.
    if (lastUrl.current === url) return;
    lastUrl.current = url;

    track("page_view", { page_path: url });

    const caseId = /^\/case-studies\/([a-z0-9-]+)$/.exec(location.pathname)?.[1];
    if (caseId) track("case_study_view", { case_id: caseId });
  }, [pathname]);

  // A visitor who accepts after landing has already had their first page_view
  // recorded without a session. Re-firing it once, now that a session can
  // exist, is what stops every accepted visit starting on page two.
  useEffect(() => {
    const onConsent = () => track("page_view", { page_path: location.pathname });
    window.addEventListener(CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(CONSENT_EVENT, onConsent);
  }, []);

  // Clicks, and the first touch of the form. One listener each, on the
  // document, so content that arrives later is covered without being wired.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target instanceof Element ? e.target : null;
      if (!target) return;

      const marked = target.closest<HTMLElement>("[data-track-event]");
      if (marked) {
        const name = marked.dataset.trackEvent;
        if (name) track(name, { ...paramsFrom(marked), section: sectionOf(marked) });
        return;
      }

      const link = target.closest<HTMLAnchorElement>("a[href]");
      if (link && /^https:\/\/wa\.me\//.test(link.href)) {
        track("whatsapp_click", { section: sectionOf(link) });
        return;
      }

      // The booking buttons fire book_call_click themselves, with the id the
      // booking is later matched on. Counting them as a cta_click as well
      // would be one press reported as two events.
      const button = target.closest<HTMLElement>(".btn, .header-cta, .menu-cta");
      if (button && !button.hasAttribute("data-placement")) {
        const text = (button.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
        track("cta_click", {
          cta_id: button.id || slug(text),
          cta_text: text,
          section: sectionOf(button),
        });
      }
    };

    let formStarted = false;
    const onFocusIn = (e: FocusEvent) => {
      if (formStarted) return;
      const target = e.target instanceof Element ? e.target : null;
      if (!target?.closest("form.lead-form")) return;
      formStarted = true;
      track("form_start", { form: "contact", section: sectionOf(target) });
    };

    document.addEventListener("click", onClick);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, []);

  // Scroll depth: 25, 50, 75 and 90, once each per page.
  useEffect(() => {
    const seen = new Set<number>();
    let frame = 0;

    const measure = () => {
      frame = 0;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      // A page that fits on the screen has no depth to report.
      if (scrollable < 200) return;
      const percent = (window.scrollY / scrollable) * 100;
      for (const mark of SCROLL_MARKS) {
        if (percent >= mark && !seen.has(mark)) {
          seen.add(mark);
          track("scroll_depth", { percent: mark });
        }
      }
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [pathname]);

  return null;
}
