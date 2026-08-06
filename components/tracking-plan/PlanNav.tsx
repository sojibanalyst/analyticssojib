"use client";

import { useEffect, useState } from "react";
import { planSections, trackingPlanMeta } from "@/content/tracking-plan";

/**
 * Sticky contents list. Desktop shows it alongside the document and highlights
 * the section currently in view; below 1024px it collapses to a <details>
 * disclosure so it costs one line instead of a screen.
 *
 * Scroll position is read from an IntersectionObserver rather than a scroll
 * handler, so nothing runs on the main thread between sections.
 */
export function PlanNav() {
  const [active, setActive] = useState(planSections[0].id);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const seen = new Map<string, boolean>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set(e.target.id, e.isIntersecting);
        // The topmost section still intersecting wins, so scrolling up and
        // down both land on the heading the reader can actually see.
        const current = planSections.find((s) => seen.get(s.id));
        if (current) setActive(current.id);
      },
      // Bias the band toward the top of the viewport, under the sticky header.
      { rootMargin: "-88px 0px -55% 0px", threshold: 0 },
    );

    for (const s of planSections) {
      const el = document.getElementById(s.id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, []);

  const list = (
    <ol className="plan-nav__list">
      {planSections.map((s) => (
        <li key={s.id}>
          <a
            href={`#${s.id}`}
            className="plan-nav__link"
            aria-current={active === s.id ? "true" : undefined}
          >
            <span className="plan-nav__num">{s.num}</span>
            <span>{s.kicker}</span>
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <>
      <nav className="plan-nav" aria-label="Contents">
        <span className="plan-nav__title">{trackingPlanMeta.contentsLabel}</span>
        {list}
      </nav>

      <details className="plan-nav-mobile">
        <summary>{trackingPlanMeta.contentsLabel}</summary>
        {list}
      </details>
    </>
  );
}
