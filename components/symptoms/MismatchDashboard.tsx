"use client";

import { useEffect, useRef, useState } from "react";

import { symptoms } from "@/content/site";

const { dashboard } = symptoms;

/** How long the figures take to settle. Matches --dur-reveal. */
const SETTLE_MS = 700;

/** The site's easing, cubic-bezier(0.22, 1, 0.36, 1), as a function of time. */
const easeOut = (t: number) => 1 - Math.pow(1 - t, 5);

const money = (n: number) => `${dashboard.currency}${Math.round(n).toLocaleString("en-US")}`;

/** "+27%" or "−17%" against the order table. A real minus sign, not a hyphen. */
function drift(value: number): string {
  const pct = Math.round(((value - dashboard.truth) / dashboard.truth) * 100);
  if (pct === 0) return "source of truth";
  return `${pct > 0 ? "+" : "−"}${Math.abs(pct)}% vs orders`;
}

/**
 * Three numbers that should be one.
 *
 * `reconciled` false: each tile shows its own figure, and the two that
 * disagree with the order table are red and say by how much.
 * `reconciled` true: every tile counts to the order table's figure and turns
 * green, and the old figure stays underneath, struck through, so the "before"
 * is never lost. That matters most under reduced motion, where this state is
 * the only one a visitor sees.
 *
 * The figures are illustrative and the panel is labelled as such; see the
 * note on `symptoms.dashboard` in content/site.ts.
 *
 * `animate` false skips the count and lands on the final value.
 */
export function MismatchDashboard({
  reconciled,
  animate,
}: {
  reconciled: boolean;
  animate: boolean;
}) {
  // 0 is "every tile on its own number", 1 is "every tile on the truth".
  const [t, setT] = useState(reconciled ? 1 : 0);
  const from = useRef(t);

  useEffect(() => {
    const target = reconciled ? 1 : 0;
    const start = from.current;
    if (start === target) return;

    if (!animate) {
      from.current = target;
      // Landing on the final value is the whole of the reduced-motion path.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setT(target);
      return;
    }

    let frame = 0;
    const began = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - began) / SETTLE_MS);
      const value = start + (target - start) * easeOut(k);
      from.current = value;
      setT(value);
      if (k < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reconciled, animate]);

  return (
    <figure className="dash" data-reconciled={reconciled}>
      <figcaption className="dash__head">
        <span className="dash__title">{dashboard.title}</span>
        <span className="dash__note">{dashboard.note}</span>
      </figcaption>

      <dl className="dash__tiles">
        {dashboard.tiles.map((tile) => {
          const off = tile.value !== dashboard.truth;
          const shownValue = tile.value + (dashboard.truth - tile.value) * t;
          return (
            <div key={tile.source} className="dash__tile" data-off={off}>
              <dt className="dash__source">
                {tile.source}
                <span className="dash__metric">{tile.metric}</span>
              </dt>
              {/* aria-hidden on the moving number: a figure that changes sixty
                  times a second is noise to a screen reader. The sentence
                  below it carries the same information once. */}
              <dd className="dash__value">
                <span aria-hidden="true">{money(shownValue)}</span>
                <span className="sr-only">
                  {reconciled && off
                    ? `${money(dashboard.truth)}, was ${money(tile.value)}`
                    : money(tile.value)}
                </span>
              </dd>
              <dd className="dash__drift">
                {reconciled && off ? (
                  <span aria-hidden="true">
                    was <s>{money(tile.value)}</s>
                  </span>
                ) : (
                  drift(tile.value)
                )}
              </dd>
            </div>
          );
        })}
      </dl>

      <p className="dash__status" role="status">
        <span className="dash__dot" aria-hidden="true" />
        <span className="dash__status-label">
          {reconciled ? dashboard.reconciled : dashboard.mismatched}
        </span>
        {reconciled ? <span className="dash__status-note">{dashboard.reconciledNote}</span> : null}
      </p>
    </figure>
  );
}
