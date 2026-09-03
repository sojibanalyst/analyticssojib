"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * The evidence advances as you scroll past the case.
 *
 * Each case card's screenshot gallery is driven by how far the card has
 * travelled through the viewport: enter at the bottom and it sits on the first
 * screenshot, leave at the top and it has walked through all four. The card
 * does not pin and the page does not get taller — the sweep costs nothing
 * because it rides scrolling that was going to happen anyway.
 *
 * PINNING WAS THE OTHER OPTION AND IT WAS WORSE. Sticking the card and
 * consuming scroll would have added roughly two screens per case study to a
 * page Sojib has already called long, and it takes the scroll away from
 * somebody who only wanted to get past.
 *
 * WHY IT DRIVES scrollLeft RATHER THAN A TRANSFORM. CaseGallery reads its own
 * scrollLeft to decide which dot is lit and what the counter says. Moving the
 * track by transform would have looked right and left the dots stuck on 01/04;
 * moving its scroll position means the existing component updates itself and
 * nothing had to be rewired.
 *
 * THE VISITOR ALWAYS WINS. First touch, key, wheel or click on a track hands
 * it over permanently: that gallery stops being driven for the rest of the
 * visit. An animation that fights the person using it is a bug with a nice
 * easing curve.
 *
 * Desktop only. On a phone the track is a swipe target, and taking a swipe
 * surface away from a thumb to run an effect is the same mistake in a smaller
 * space.
 */

const MIN_WIDTH = 1024;

export function CaseScroll() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.innerWidth < MIN_WIDTH) return;

    const tracks = [...document.querySelectorAll<HTMLElement>(".case-card .case-gallery__track")]
      .map((track) => ({ track, card: track.closest<HTMLElement>(".case-card") }))
      .filter(
        (t): t is { track: HTMLElement; card: HTMLElement } =>
          t.card !== null && t.track.scrollWidth - t.track.clientWidth > 8,
      );

    if (tracks.length === 0) return;

    const manual = new WeakSet<HTMLElement>();

    const release = (track: HTMLElement) => {
      if (manual.has(track)) return;
      manual.add(track);
      // Snapping goes back on the moment the visitor takes over, so their
      // swipe lands on a screenshot rather than between two.
      delete track.dataset.autoscroll;
    };

    const listeners: Array<() => void> = [];
    for (const { track } of tracks) {
      const hand = () => release(track);
      for (const ev of ["pointerdown", "keydown", "wheel", "click"] as const) {
        track.addEventListener(ev, hand, { passive: true });
        listeners.push(() => track.removeEventListener(ev, hand));
      }
      // The pager sits outside the track but drives it.
      const pager = track.parentElement?.querySelector(".case-gallery__pager");
      if (pager) {
        pager.addEventListener("click", hand, { passive: true });
        listeners.push(() => pager.removeEventListener("click", hand));
      }
      track.dataset.autoscroll = "on";
    }

    let frame = 0;
    const update = () => {
      frame = 0;
      const vh = window.innerHeight;
      for (const { track, card } of tracks) {
        if (manual.has(track)) continue;
        const r = card.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) continue;

        // 0 when the card's top sits at three quarters of the viewport,
        // 1 by the time its bottom has risen to a quarter.
        const from = vh * 0.75;
        const to = vh * 0.25 - r.height;
        const p = Math.max(0, Math.min(1, (from - r.top) / (from - to)));

        const max = track.scrollWidth - track.clientWidth;
        const next = Math.round(p * max);
        if (Math.abs(track.scrollLeft - next) > 1) track.scrollLeft = next;
      }
    };

    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(update);
    };

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    update();

    return () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      for (const off of listeners) off();
      for (const { track } of tracks) delete track.dataset.autoscroll;
    };
  }, [pathname]);

  return null;
}
