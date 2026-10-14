"use client";

import { CornerDownLeft, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { createHref, navGroups } from "@/app/(admin)/admin/nav";
import type { PaletteEntry } from "@/app/(admin)/admin/(console)/palette-actions";
import { NavIcon } from "@/components/admin/ui/icons";

type Item = { id: string; group: string; title: string; hint?: string; href: string; icon: React.ReactNode };

/**
 * Ctrl+K (Cmd+K on a Mac): jump to any screen, run a "New ..." action, or find
 * a case study, project, review or post by title.
 *
 * A native <dialog>, so focus stays inside and Escape closes it. Arrow keys
 * move through the results and Enter opens one; the list is a listbox with
 * aria-activedescendant, so a screen reader follows the highlight. The
 * content index is fetched the first time it opens.
 */
export function CommandPalette({
  open,
  onOpenChange,
  load,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  load: () => Promise<PaletteEntry[]>;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [entries, setEntries] = useState<PaletteEntry[] | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      inputRef.current?.focus();
      if (entries === null) load().then(setEntries, () => setEntries([]));
    }
    if (!open && dialog.open) dialog.close();
  }, [open, entries, load]);

  const items = useMemo<Item[]>(() => {
    const screens: Item[] = navGroups.flatMap((group) =>
      group.items.map((item) => ({
        id: `go:${item.href}`,
        group: "Go to",
        title: item.label,
        hint: group.title,
        href: item.href,
        icon: <NavIcon href={item.href} size={16} />,
      })),
    );
    const actions: Item[] = navGroups.flatMap((group) =>
      group.items
        .filter((item) => item.create)
        .map((item) => ({
          id: `new:${item.href}`,
          group: "Actions",
          title: item.create!,
          href: createHref(item),
          icon: <Plus size={16} aria-hidden="true" />,
        })),
    );
    const content: Item[] = (entries ?? []).map((entry) => ({
      id: `c:${entry.href}`,
      group: "Content",
      title: entry.title,
      hint: entry.kind,
      href: entry.href,
      icon: <Search size={16} aria-hidden="true" />,
    }));

    const q = query.trim().toLowerCase();
    if (!q) return [...actions, ...screens];
    const match = (item: Item) => `${item.title} ${item.hint ?? ""}`.toLowerCase().includes(q);
    return [...actions.filter(match), ...screens.filter(match), ...content.filter(match).slice(0, 30)];
  }, [entries, query]);

  const current = Math.min(active, Math.max(items.length - 1, 0));

  const go = (item: Item | undefined) => {
    if (!item) return;
    onOpenChange(false);
    setQuery("");
    router.push(item.href);
  };

  let lastGroup = "";

  return (
    <dialog
      ref={dialogRef}
      className="ax-palette"
      aria-label="Command palette"
      onClose={() => onOpenChange(false)}
      onClick={(event) => {
        if (event.target === event.currentTarget) onOpenChange(false);
      }}
    >
      <div className="ax-palette__search">
        <Search size={18} aria-hidden="true" />
        <input
          ref={inputRef}
          value={query}
          placeholder="Search screens, content and actions"
          role="combobox"
          aria-expanded="true"
          aria-controls="ax-palette-list"
          aria-activedescendant={items[current] ? `ax-pal-${current}` : undefined}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActive((current + 1) % Math.max(items.length, 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((current - 1 + items.length) % Math.max(items.length, 1));
            } else if (event.key === "Enter") {
              event.preventDefault();
              go(items[current]);
            }
          }}
        />
        <kbd className="ax-kbd">Esc</kbd>
      </div>

      <ul id="ax-palette-list" className="ax-palette__list" role="listbox" aria-label="Results">
        {items.map((item, i) => {
          const heading = item.group !== lastGroup ? item.group : null;
          lastGroup = item.group;
          return (
            <li key={item.id} role="presentation">
              {heading ? (
                <p className="ax-palette__group" aria-hidden="true">
                  {heading}
                </p>
              ) : null}
              <div
                id={`ax-pal-${i}`}
                role="option"
                aria-selected={i === current}
                className="ax-palette__item"
                onMouseMove={() => setActive(i)}
                onClick={() => go(item)}
              >
                <span className="ax-palette__icon">{item.icon}</span>
                <span className="ax-palette__title">{item.title}</span>
                {item.hint ? <span className="ax-palette__hint">{item.hint}</span> : null}
                {i === current ? <CornerDownLeft size={14} aria-hidden="true" className="ax-palette__enter" /> : null}
              </div>
            </li>
          );
        })}
        {!items.length ? (
          <li className="ax-palette__none">{entries === null ? "Loading..." : "Nothing found."}</li>
        ) : null}
      </ul>
    </dialog>
  );
}
