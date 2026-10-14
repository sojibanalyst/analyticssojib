"use client";

import { MoreHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type MenuItem = { label: string; onSelect: () => void; danger?: boolean; disabled?: boolean; href?: string };

/**
 * The "..." menu on a row. A button that opens a menu of real buttons:
 * arrow keys move, Escape closes and returns focus, a click outside closes.
 */
export function RowMenu({ label, items }: { label: string; items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const first = wrap.current?.querySelector<HTMLElement>("[role=menuitem]:not([disabled])");
    first?.focus();
    const onDown = (event: MouseEvent) => {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    const all = [...(wrap.current?.querySelectorAll<HTMLElement>("[role=menuitem]:not([disabled])") ?? [])];
    const at = all.indexOf(document.activeElement as HTMLElement);
    if (event.key === "Escape") {
      setOpen(false);
      trigger.current?.focus();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      all[(at + 1) % all.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      all[(at - 1 + all.length) % all.length]?.focus();
    }
  };

  return (
    <div className="ax-menu" ref={wrap} onKeyDown={onKeyDown}>
      <button
        ref={trigger}
        type="button"
        className="ax-iconbtn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreHorizontal size={18} aria-hidden="true" />
      </button>
      {open ? (
        <div className="ax-menu__list" role="menu" aria-label={label}>
          {items.map((item) =>
            item.href ? (
              <a
                key={item.label}
                role="menuitem"
                className="ax-menu__item"
                href={item.href}
                target="_blank"
                rel="noopener"
                onClick={() => setOpen(false)}
              >
                {item.label}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ) : (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                className="ax-menu__item"
                data-danger={item.danger || undefined}
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
              >
                {item.label}
              </button>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}
