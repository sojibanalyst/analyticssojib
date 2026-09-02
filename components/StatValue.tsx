"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { observeInView } from "@/lib/in-view";

/**
 * The Upwork figures counting up once, the first time they are scrolled to.
 *
 * On a site whose argument is that numbers should be trustworthy, a number
 * that animates has to be held to a couple of rules:
 *
 *   - It counts ONCE. Not on every scroll past, not on a loop. A figure that
 *     re-animates is decoration; a figure that resolves once is an arrival.
 *
 *   - It never animates a value that is not a settled number. If `value` does
 *     not parse — an em dash, an empty string, a "…" while something loads —
 *     it renders verbatim and no animation is set up at all. Counting up to a
 *     placeholder would be inventing precision the page does not have.
 *
 *   - Server render is the FINAL value, so no-JS, reduced motion and crawlers
 *     all get the real figure with no interstitial state.
 *
 *   - IT NEVER REWINDS A NUMBER SOMEBODY HAS ALREADY READ. This one came out
 *     of sampling the rendered text every 100ms: the server value sat on
 *     screen until hydration, then dropped to a third of itself and climbed
 *     back. 384 → 132 → 384. On a site whose argument is that numbers should
 *     be trustworthy, a figure that visibly counts DOWN on load is a defect
 *     wearing an animation's clothes. So the count is armed only for stats
 *     that are still BELOW THE FOLD when hydration finishes. Above the fold,
 *     the visitor has read it; it stays read.
 *
 *     In practice that is not the narrow case it sounds like — the stat band
 *     begins around 790px, below the fold on most laptop viewports and far
 *     below it on a phone. And nothing is static either way: the cards are
 *     part of the scroll reveal regardless.
 *
 * Accessibility: the animating span is aria-hidden and a visually hidden
 * sibling carries the settled value, so a screen reader announces "4.9" once
 * instead of narrating sixty frames of arithmetic.
 */

const DURATION_MS = 900;

// Ease-out cubic. Fast at the start, settling at the end — a counter that
// decelerates reads as landing on a value rather than being cut off at one.
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export function StatValue({ value }: { value: string }) {
  const target = Number(value);
  const settled = value.trim() !== "" && Number.isFinite(target);
  const decimals = value.includes(".") ? value.split(".")[1]?.length ?? 0 : 0;

  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);
  const [armed, setArmed] = useState(false);

  // A layout effect so the reset to zero lands before the browser paints. In
  // a passive effect it would show the final value for a frame first.
  useLayoutEffect(() => {
    if (!settled) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const el = ref.current;
    if (!el) return;

    // Already on screen at hydration — see the note above. Leave it alone.
    if (el.getBoundingClientRect().top < window.innerHeight) return;

    setArmed(true);
    setDisplay((0).toFixed(decimals));
  }, [settled, decimals]);

  useEffect(() => {
    if (!armed) return;

    const el = ref.current;
    if (!el) return;

    let frame = 0;

    /**
     * Same arrival test as the scroll reveal, and for a sharper reason here.
     * If a viewer flick-scrolls past the stat band and the trigger misses,
     * a reveal leaves an element invisible — but this would leave the page
     * displaying "0 JOBS COMPLETED" for the rest of the visit. A wrong number
     * on a site about wrong numbers. observeInView cannot miss.
     */
    const stop = observeInView([el], () => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min((now - start) / DURATION_MS, 1);
        setDisplay((target * easeOut(t)).toFixed(decimals));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    });

    return () => {
      stop();
      cancelAnimationFrame(frame);
    };
  }, [armed, target, decimals]);

  if (!settled) return <>{value}</>;

  return (
    <>
      {/* The width of the SETTLED value is reserved up front and the figures
          are tabular, so "0 → 51" does not shove the unit beside it sideways
          for 900ms. A counter that reflows its own row while it runs is the
          thing that makes this effect look cheap. */}
      <span
        ref={ref}
        aria-hidden="true"
        style={{
          display: "inline-block",
          minWidth: `${value.length}ch`,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {display}
      </span>
      <span className="sr-only">{value}</span>
    </>
  );
}
