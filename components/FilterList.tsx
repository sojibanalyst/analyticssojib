"use client";

import { useState } from "react";

export type FilterEntry = { key: string; groups: string[]; node: React.ReactNode };

/**
 * A row of filter chips over a list. The entries arrive already rendered
 * (server components stay server components) with the groups each belongs to;
 * this only decides which are shown.
 *
 * A chip appears only if something matches it, in the order the rules were
 * given, with its count. The whole row is left out when it would offer no
 * real choice: one chip that matches everything filters nothing.
 *
 * Changing the filter mounts a fresh list so its items rise in again (the
 * .masonry__item animation; nothing under reduced motion).
 */
export function FilterList({
  entries,
  order,
  label,
  allLabel,
  showingLabel,
  listClassName,
  itemClassName,
}: {
  entries: FilterEntry[];
  /** Every possible group, in chip order. */
  order: string[];
  label: string;
  allLabel: string;
  showingLabel: string;
  listClassName: string;
  itemClassName?: string;
}) {
  const [group, setGroup] = useState<string | null>(null);

  const chips = order
    .map((name) => [name, entries.filter((e) => e.groups.includes(name)).length] as const)
    .filter(([, n]) => n > 0 && n < entries.length + 1);
  const useful = chips.some(([, n]) => n < entries.length) && entries.length > 1;

  const shown = group ? entries.filter((e) => e.groups.includes(group)) : entries;

  return (
    <>
      {useful ? (
        <div className="chips" role="group" aria-label={label}>
          <button type="button" className="chip" aria-pressed={group === null} onClick={() => setGroup(null)}>
            {allLabel} <span className="chip__n">{entries.length}</span>
          </button>
          {chips.map(([name, n]) => (
            <button
              key={name}
              type="button"
              className="chip"
              aria-pressed={group === name}
              onClick={() => setGroup(group === name ? null : name)}
            >
              {name} <span className="chip__n">{n}</span>
            </button>
          ))}
        </div>
      ) : null}

      {useful ? (
        <p className="sr-only" aria-live="polite">
          {shown.length} {showingLabel}
        </p>
      ) : null}

      <ul key={group ?? "all"} className={listClassName}>
        {shown.map((entry, i) => (
          <li
            key={entry.key}
            className={`masonry__item${itemClassName ? ` ${itemClassName}` : ""}`}
            style={{ ["--i" as string]: Math.min(i, 8) }}
          >
            {entry.node}
          </li>
        ))}
      </ul>
    </>
  );
}
