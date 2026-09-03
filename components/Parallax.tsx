"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Depth on the evidence screenshots.
 *
 * Each case screenshot drifts a little slower than the page it sits on, so the
 * image reads as sitting behind its own frame rather than pasted onto it. The
 * effect is deliberately small — 22px over a full screen of travel. Parallax
 * that you notice as parallax has stopped being depth and started being a
 * carousel.
 *
 * It writes a CSS custom property and lets the compositor do the transform,
 * rather than setting `transform` from JavaScript on every frame: one style
 * write per element per frame, no layout, no paint.
 *
 * SAFETY, THE SAME SHAPE AS THE REST OF THE MOTION HERE. The transform only
 * exists under [data-parallax="on"], which this component sets after checking
 * the media query. With reduced motion, with JavaScript off, or before
 * hydration, the images sit exactly where they always did — there is no state
 * a failed script can strand them in.
 *
 * Elements outside the viewport are skipped, so the per-frame cost is the two
 * or three screenshots actually on screen.
 */

const MAX_SHIFT_PX = 22;

export function Parallax() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const els = [...document.querySelectorAll<HTMLElement>("[data-par]")];
    if (els.length === 0) return;

    document.documentElement.dataset.parallax = "on";

    let frame = 0;
    const update = () => {
      frame = 0;
      const vh = window.innerHeight;
      for (const el of els) {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) continue;
        // -1 while entering from the bottom, 0 dead centre, +1 while leaving
        // at the top.
        const centre = r.top + r.height / 2;
        const travel = vh / 2 + r.height / 2;
        const t = Math.max(-1, Math.min(1, (centre - vh / 2) / travel));
        el.style.setProperty("--par", `${(-t * MAX_SHIFT_PX).toFixed(1)}px`);
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
      delete document.documentElement.dataset.parallax;
      for (const el of els) el.style.removeProperty("--par");
    };
  }, [pathname]);

  return null;
}
