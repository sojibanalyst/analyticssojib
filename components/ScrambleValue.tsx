"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { observeInView } from "@/lib/in-view";

/**
 * The case-study headline figures resolve out of noise.
 *
 * Every digit cycles through other digits and then locks, left to right, so
 * "61%" and "98%" arrive the way a number arrives when you finally reconcile
 * it: unreadable, then settled. On a site whose whole argument is that a
 * figure was wrong until somebody checked it, this is the one decorative
 * effect that is also the thesis.
 *
 * Rules it inherits from StatValue, for the same reasons:
 *
 *   - Only DIGITS scramble. The %, the x and the decimal point hold still, so
 *     the shape of the number never changes and nothing reflows.
 *   - It never rewinds a figure somebody has already read: armed only for
 *     values still below the fold when hydration finishes.
 *   - Server renders the settled value, so no-JS, reduced motion and crawlers
 *     all get the real number with no interstitial state.
 *   - The animating span is aria-hidden with a visually hidden sibling
 *     carrying the real value, so a screen reader is read "98%" once instead
 *     of forty frames of noise.
 */

const DURATION_MS = 900;
const DIGITS = "0123456789";

export function ScrambleValue({ value }: { value: string }) {
  const hasDigits = /\d/.test(value);
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);
  const [armed, setArmed] = useState(false);

  useLayoutEffect(() => {
    if (!hasDigits) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const el = ref.current;
    if (!el) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return;

    setArmed(true);
    // Seed the noise now rather than on arrival. The in-view trigger fires
    // when the element's top reaches 92% of the viewport, by which point a
    // sliver of it is already on screen — without this, a slow scroll could
    // catch the settled figure for a frame and then watch it scramble, which
    // is the rewind problem wearing a different hat.
    setDisplay(
      value
        .split("")
        .map((ch) => (/\d/.test(ch) ? DIGITS[Math.floor(Math.random() * 10)] : ch))
        .join(""),
    );
  }, [hasDigits, value]);

  useEffect(() => {
    if (!armed) return;
    const el = ref.current;
    if (!el) return;

    let frame = 0;
    const stop = observeInView([el], () => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min((now - start) / DURATION_MS, 1);
        // Each position locks in turn, the last one landing at t = 1. The 0.75
        // keeps a little noise on the final digit rather than freezing the
        // whole number a beat early.
        const out = value
          .split("")
          .map((ch, i) => {
            if (!/\d/.test(ch)) return ch;
            const lockAt = ((i + 1) / value.length) * 0.75;
            if (t >= lockAt) return ch;
            return DIGITS[Math.floor(Math.random() * 10)];
          })
          .join("");
        setDisplay(out);
        if (t < 1) frame = requestAnimationFrame(tick);
        else setDisplay(value);
      };
      frame = requestAnimationFrame(tick);
    });

    return () => {
      stop();
      cancelAnimationFrame(frame);
    };
  }, [armed, value]);

  if (!hasDigits) return <>{value}</>;

  return (
    <>
      <span
        ref={ref}
        aria-hidden="true"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {display}
      </span>
      <span className="sr-only">{value}</span>
    </>
  );
}
