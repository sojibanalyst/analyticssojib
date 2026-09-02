"use client";

import { useEffect, useRef } from "react";

/**
 * A 2px accent line across the top, filling as the page is read.
 *
 * The one piece of chrome here that the reference site does not have, and the
 * one that suits this site best: it is an instrument reading, not decoration.
 * On a 9,000px page that argues about measurement, telling somebody how far
 * through the argument they are is worth two pixels.
 *
 * It is NOT gated on prefers-reduced-motion. Nothing here animates on its own
 * — the bar only moves in direct response to the visitor's own scrolling, the
 * same way a scrollbar does, and hiding a position indicator from the people
 * most likely to want one would be the wrong reading of that setting.
 *
 * scaleX on a fixed element, written straight to style rather than through
 * React state: this updates on every frame of a scroll, and a setState per
 * frame would re-render the tree for a number nothing else reads.
 */
export function ScrollProgress() {
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bar.current;
    if (!el) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0;
      el.style.transform = `scaleX(${progress})`;
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
    };
  }, []);

  return (
    <div className="scroll-progress" aria-hidden="true">
      <div ref={bar} className="scroll-progress__bar" />
    </div>
  );
}
