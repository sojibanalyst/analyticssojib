"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { trackingDrawer } from "@/content/site";
import { getSentEvents, subscribeSentEvents, type SentEvent } from "@/lib/track";

const EMPTY: SentEvent[] = [];

function clock(at: number): string {
  return new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/** Parameters as "key: value" pairs, minus the ones that only repeat the row. */
function details(event: SentEvent): string[] {
  return Object.entries(event.params)
    .filter(([key, value]) => key !== "page_path" && value !== null && value !== "")
    .map(([key, value]) => `${key}: ${String(value)}`);
}

/**
 * "See what I'm tracking about you".
 *
 * A button in the corner that opens a drawer listing every event this browser
 * has sent during this visit, each with a sentence saying what it is for.
 *
 * It reads the list lib/track.ts keeps in memory as it sends. Nothing is
 * fetched: the drawer shows the visitor's own events from the visitor's own
 * tab, so it cannot show anybody else's and has nothing to leak. Reload the
 * page and the list starts again, which the drawer says.
 *
 * A modal dialog, with what that requires: focus moves in when it opens and
 * back to the button when it closes, Tab stays inside, Escape closes, and the
 * page behind is locked and inert to scrolling.
 */
export function TrackingDrawer() {
  const [open, setOpen] = useState(false);
  const events = useSyncExternalStore(subscribeSentEvents, getSentEvents, () => EMPTY);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    buttonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  // Newest first: the event the visitor just caused is the one they are
  // looking for.
  const rows = [...events].reverse();

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="track-fab"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span className="track-fab__dot" aria-hidden="true" />
        <span className="track-fab__label">{trackingDrawer.button}</span>
        <span className="track-fab__count" aria-label={`${events.length} events so far`}>
          {events.length}
        </span>
      </button>

      {open && (
        <>
          <div className="track-scrim" onClick={close} aria-hidden="true" />
          <div
            ref={panelRef}
            className="track-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="track-drawer-title"
            // The page behind is scroll-locked; this lets the wheel through to
            // the drawer's own list instead of being swallowed by Lenis.
            data-lenis-prevent
          >
            <div className="track-drawer__head">
              <h2 id="track-drawer-title" className="track-drawer__title">
                {trackingDrawer.title}
              </h2>
              <button ref={closeRef} type="button" className="track-drawer__close" onClick={close}>
                {trackingDrawer.close}
              </button>
            </div>

            <p className="track-drawer__intro">{trackingDrawer.intro}</p>

            {rows.length === 0 ? (
              <p className="track-drawer__empty">{trackingDrawer.empty}</p>
            ) : (
              <ol className="track-drawer__list">
                {rows.map((event) => {
                  const extra = details(event);
                  return (
                    <li key={event.id} className="track-row">
                      <div className="track-row__top">
                        <code className="track-row__name">{event.name}</code>
                        <time className="track-row__time">{clock(event.at)}</time>
                      </div>
                      <p className="track-row__what">
                        {trackingDrawer.explain[event.name as keyof typeof trackingDrawer.explain] ??
                          trackingDrawer.explainOther}
                      </p>
                      <p className="track-row__meta">
                        {event.path}
                        {extra.length ? ` · ${extra.join(" · ")}` : ""}
                      </p>
                      {!event.sent && <p className="track-row__held">{trackingDrawer.held}</p>}
                    </li>
                  );
                })}
              </ol>
            )}

            <div className="track-drawer__foot">
              <p>{trackingDrawer.never}</p>
              <a href="/privacy">{trackingDrawer.privacyLink}</a>
            </div>
          </div>
        </>
      )}
    </>
  );
}
