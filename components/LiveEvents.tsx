"use client";

import { useEffect, useRef, useState } from "react";

import { livePanel } from "@/content/site";

type RecentEvent = { event_name: string; page_path: string; at: string };

const ENDPOINT = "/api/events/recent";
const POLL_MS = 10_000;

/** "just now", "4 min ago", "3 h ago", "2 d ago". */
function ago(iso: string, now: number): string {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 45) return "just now";
  if (seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))} min ago`;
  if (seconds < 86_400) return `${Math.round(seconds / 3600)} h ago`;
  return `${Math.round(seconds / 86_400)} d ago`;
}

/**
 * "This site, tracked live".
 *
 * The latest events from this site's own collector: an event name, the page
 * it happened on, and how long ago. That is everything the endpoint returns
 * and everything it is able to return; see app/api/events/recent/route.ts.
 *
 * It is a client component fetching after load, on purpose. Reading the
 * events while rendering the page would make the homepage dynamic, and every
 * public page on this site is static.
 *
 * It only asks while it can be seen: nothing is fetched until the panel is
 * near the screen, and polling stops when it scrolls away or the tab is
 * hidden. Under reduced motion new rows simply appear; there is no entrance
 * to switch off because the list never animates.
 *
 * The list is not a live region. A screen reader would be interrupted every
 * ten seconds by somebody else's page view.
 */
export function LiveEvents() {
  const ref = useRef<HTMLElement>(null);
  const [events, setEvents] = useState<RecentEvent[] | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let visible = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(ENDPOINT, { headers: { Accept: "application/json" } });
        if (!res.ok) return;
        const body = (await res.json()) as { events?: RecentEvent[] };
        if (cancelled || !Array.isArray(body.events)) return;
        setEvents(body.events);
        setNow(Date.now());
      } catch {
        // Offline, or blocked. The panel keeps whatever it last showed.
      }
    };

    const sync = () => {
      const shouldRun = visible && document.visibilityState === "visible";
      if (shouldRun && !timer) {
        void load();
        timer = setInterval(load, POLL_MS);
      } else if (!shouldRun && timer) {
        clearInterval(timer);
        timer = undefined;
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        visible = entries.some((e) => e.isIntersecting);
        sync();
      },
      { rootMargin: "200px 0px" },
    );
    observer.observe(el);
    document.addEventListener("visibilitychange", sync);

    return () => {
      cancelled = true;
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      if (timer) clearInterval(timer);
    };
  }, []);

  return (
    <section ref={ref} className="section section--sunk live" aria-labelledby="live-title">
      <div className="live__intro">
        <span className="eyebrow">{livePanel.eyebrow}</span>
        <h2 id="live-title" className="h2">
          {livePanel.title}
        </h2>
        <p className="live__body">{livePanel.body}</p>
      </div>

      <div className="live__panel">
        <div className="live__bar">
          <span className="live__status">
            <span className="live__pulse" aria-hidden="true" />
            {livePanel.status}
          </span>
          <span>{livePanel.source}</span>
        </div>

        {events === null ? (
          <p className="live__empty">{livePanel.loading}</p>
        ) : events.length === 0 ? (
          <p className="live__empty">{livePanel.empty}</p>
        ) : (
          <ol className="live__list">
            {events.map((event, i) => (
              <li key={`${event.at}-${i}`} className="live__row">
                <code className="live__name">{event.event_name}</code>
                <span className="live__path">{event.page_path}</span>
                <time className="live__time" dateTime={event.at}>
                  {ago(event.at, now)}
                </time>
              </li>
            ))}
          </ol>
        )}

        <p className="live__note">{livePanel.note}</p>
      </div>
    </section>
  );
}
