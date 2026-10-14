"use client";

import { useMemo, useState } from "react";

import { ProjectCard } from "@/components/ProjectCard";
import { portfolioCopy } from "@/content/site";
import type { PortfolioItem } from "@/lib/content";

/** How many skills get a chip. The rest are still on every card. */
const CHIPS = 8;

/**
 * The /work index: chips to narrow by skill, and the projects as a masonry of
 * cards in columns, so a card with a tall screenshot and one with a short
 * write-up sit together without gaps.
 *
 * The chips are the skills that come up most often across the projects shown,
 * counted here from the data rather than typed in, so a new project with a new
 * skill moves the chips by itself.
 *
 * Changing the filter mounts a fresh list, and its cards rise in one after
 * another (transform and opacity, nothing under reduced motion). The filter is
 * a row of toggle buttons; the count of what is showing is announced politely.
 */
export function WorkGrid({ items }: { items: PortfolioItem[] }) {
  const [skill, setSkill] = useState<string | null>(null);

  const chips = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) for (const s of item.skills) counts.set(s, (counts.get(s) ?? 0) + 1);
    return [...counts.entries()]
      .filter(([, n]) => n > 1)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, CHIPS);
  }, [items]);

  const shown = skill ? items.filter((item) => item.skills.includes(skill)) : items;

  return (
    <div className="work-grid">
      <div className="chips" role="group" aria-label={portfolioCopy.filterLabel}>
        <button
          type="button"
          className="chip"
          aria-pressed={skill === null}
          onClick={() => setSkill(null)}
        >
          {portfolioCopy.filterAll} <span className="chip__n">{items.length}</span>
        </button>
        {chips.map(([name, n]) => (
          <button
            key={name}
            type="button"
            className="chip"
            aria-pressed={skill === name}
            onClick={() => setSkill(skill === name ? null : name)}
          >
            {name} <span className="chip__n">{n}</span>
          </button>
        ))}
      </div>

      <p className="sr-only" aria-live="polite">
        {shown.length} {portfolioCopy.filterShowing}
      </p>

      <ul key={skill ?? "all"} className="masonry">
        {shown.map((item, i) => (
          <li key={item.slug} className="masonry__item" style={{ ["--i" as string]: Math.min(i, 8) }}>
            <ProjectCard item={item} masonry />
          </li>
        ))}
      </ul>
    </div>
  );
}
