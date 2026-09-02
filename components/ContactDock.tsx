"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { CalendlyPopupButton } from "@/components/CalendlyPopupButton";
import { ctaLabel } from "@/content/site";

/**
 * The one route to contact that survives the middle of the page.
 *
 * WHY IT EXISTS, MEASURED. Scrolling the homepage and listing every contact
 * control actually inside the viewport:
 *
 *   1536px  a control at 15%, 35%, 50%, 70% and 90% — the sticky header's
 *           CTA, which never leaves. Desktop already had a persistent route.
 *   390px   NOTHING from 0% to about 85% of a 13,149px page. .header-cta is
 *           display:none below 768px, so the phone — where the scroll is
 *           longest — was the case with no way to act at all.
 *
 * WHAT HAPPENS TO THE HEADER CTA. The first build left it alone, and the
 * screenshot settled it: two identical green "BOOK A 30-MIN CALL" pills on
 * screen at once, one top-right and one bottom-right. So while the dock is up,
 * [data-dock="on"] demotes the header's copy to a quiet outline button.
 *
 * Demoted rather than removed, for two reasons. .header-cta is box-sizing:
 * border-box with the same padding either way, so swapping the fill for a
 * 1px border changes no dimension and the header does not reflow — hiding it
 * outright would shift the nav sideways every time the hero scrolled past.
 * And on a blog post or a case study there is no hero CTA above the fold, so
 * removing the header's route entirely would leave the top of those pages
 * with none at all.
 *
 * WHEN IT SHOWS. After the hero has left the viewport, and only until the
 * contact section arrives — at that point the real form is on screen and a
 * floating copy of its button is noise. That also means it is gone before the
 * footer, so it never sits on the last thing on the page.
 *
 * ON COVERING CONTENT. A fixed element overlaps the strip it occupies; that is
 * what fixed means, and any claim otherwise would be false. What is avoidable
 * is the failure worth avoiding: it is one line tall, it stays in the corner
 * rather than spanning a band across the middle, it never coexists with the
 * contact form or the footer, and it can be dismissed.
 *
 * DISMISSAL IS FOR THE SESSION, NOT FOREVER. sessionStorage rather than
 * localStorage: someone who waves it away today is not saying they never want
 * to see a way to book again, and a permanent dismissal is a decision the
 * visitor did not knowingly make.
 */

const DISMISS_KEY = "sf-dock-dismissed";
const DISMISS_EVENT = "sf-dock-dismiss";

/**
 * The dismissal is read through useSyncExternalStore rather than copied into
 * state by an effect — the same shape lib/theme.ts uses for the theme, and for
 * the same reason: sessionStorage is an external system, and mirroring it into
 * React state means a render with the wrong answer followed by a correction.
 *
 * A module-level flag backs it up because sessionStorage throws in some
 * private-browsing modes, and a dismiss button that cannot record a dismissal
 * is not a dismiss button.
 */
let dismissedFallback = false;

function subscribeDismissed(onChange: () => void) {
  window.addEventListener(DISMISS_EVENT, onChange);
  return () => window.removeEventListener(DISMISS_EVENT, onChange);
}

function readDismissed(): boolean {
  if (dismissedFallback) return true;
  try {
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

// The server always says "dismissed", so the dock is never in the server HTML
// and cannot flash before hydration decides whether it belongs there.
const dismissedOnServer = () => true;

export function ContactDock() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const dismissed = useSyncExternalStore(
    subscribeDismissed,
    readDismissed,
    dismissedOnServer,
  );
  const showing = visible && !dismissed;

  useEffect(() => {
    if (dismissed) return;

    const hero = document.querySelector("main > *:first-child");
    const contact = document.querySelector("#contact");
    if (!hero || !contact) return;

    let frame = 0;
    const check = () => {
      frame = 0;
      const heroGone = hero.getBoundingClientRect().bottom <= 0;
      const contactAway = contact.getBoundingClientRect().top > window.innerHeight;
      setVisible(heroGone && contactAway);
    };
    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(check);
    };

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    check();

    return () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [dismissed, pathname]);

  // The header watches this to demote its own CTA — see the note above.
  useEffect(() => {
    const root = document.documentElement;
    if (showing) root.dataset.dock = "on";
    else delete root.dataset.dock;
    return () => {
      delete root.dataset.dock;
    };
  }, [showing]);

  const dismiss = useCallback(() => {
    dismissedFallback = true;
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Private mode. The module flag above already carries it for this view.
    }
    window.dispatchEvent(new Event(DISMISS_EVENT));
  }, []);

  if (dismissed) return null;

  return (
    // inert rather than aria-hidden + tabIndex: it takes the whole subtree out
    // of the tab order AND out of the accessibility tree in one attribute, so
    // a keyboard user cannot land on a control they cannot see.
    <div className="dock" data-state={showing ? "in" : "out"} inert={!showing}>
      <CalendlyPopupButton className="dock__action" placement="dock">
        <span className="dock__mark" aria-hidden="true" />
        {ctaLabel}
        <span aria-hidden="true">→</span>
      </CalendlyPopupButton>

      <button type="button" className="dock__dismiss" onClick={dismiss}>
        <span aria-hidden="true">✕</span>
        <span className="sr-only">Dismiss the booking shortcut</span>
      </button>
    </div>
  );
}
