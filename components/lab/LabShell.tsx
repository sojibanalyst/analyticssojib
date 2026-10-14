"use client";

import { useEffect, useState } from "react";

import { PUSH_EVENT, pushLog, readCart } from "@/lib/lab/store";

const GTM_KEY = "lab-gtm-id";
const GTM_ID = /^GTM-[A-Z0-9]{4,10}$/;

/**
 * The lab's frame: a header, the "demo store" notice, the test container
 * loader and the dataLayer inspector.
 *
 * TEST CONTAINER: the site's real GTM container never runs on /lab (see
 * components/GoogleTagManager.tsx). Here you can load your own test container
 * by id. It is remembered in this browser only and loaded only on lab pages.
 *
 * Links between lab pages are plain <a>, so each page is a full load and fires
 * its own page view, like a classic store.
 */
export function LabShell({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0);
  const [gtm, setGtm] = useState("");
  const [loaded, setLoaded] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setCount(readCart().reduce((n, l) => n + l.quantity, 0));
    sync();
    window.addEventListener("lab:cart", sync);
    return () => window.removeEventListener("lab:cart", sync);
  }, []);

  useEffect(() => {
    let saved = "";
    try {
      saved = localStorage.getItem(GTM_KEY) ?? "";
    } catch {
      // No storage: nothing remembered.
    }
    if (!GTM_ID.test(saved)) return;
    // Remembered from a previous visit; the server cannot know it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGtm(saved);
    setLoaded(saved);
    const w = window as Window & { dataLayer?: unknown[] };
    w.dataLayer = w.dataLayer ?? [];
    w.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${saved}`;
    document.head.appendChild(script);
  }, []);

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    const id = gtm.trim().toUpperCase();
    try {
      if (id) localStorage.setItem(GTM_KEY, id);
      else localStorage.removeItem(GTM_KEY);
    } catch {
      // Not remembered.
    }
    location.reload();
  };

  return (
    <div className="lab">
      <p className="lab-notice" role="note">
        Demo store for tracking practice. Nothing is sold, no payment is taken, and nothing you do here reaches
        analyticssojib.com&rsquo;s own analytics.
      </p>

      <header className="lab-head">
        <a href="/lab" className="lab-brand">
          Demo Store
        </a>
        <nav className="lab-nav" aria-label="Store">
          <a href="/lab">Shop</a>
          <a href="/lab/cart">
            Cart <span className="lab-count">{count}</span>
          </a>
        </nav>
      </header>

      <main id="main" className="lab-main">
        {children}
      </main>

      <section className="lab-tools" aria-label="Tracking tools">
        <form className="lab-gtm" onSubmit={save}>
          <label htmlFor="lab-gtm-id">Test GTM container</label>
          <input
            id="lab-gtm-id"
            value={gtm}
            onChange={(event) => setGtm(event.target.value)}
            placeholder="GTM-XXXXXXX"
            spellCheck={false}
            pattern="^[Gg][Tt][Mm]-[A-Za-z0-9]{4,10}$"
          />
          <button type="submit" disabled={!gtm.trim() && !loaded}>
            {!gtm.trim() && loaded ? "Remove container" : "Load container"}
          </button>
          <p className="lab-hint">
            {loaded ? `Loaded: ${loaded}. Only on lab pages, only in this browser.` : "No container loaded. Events still go to window.dataLayer."}
          </p>
        </form>
        <Inspector />
      </section>

      <footer className="lab-foot">
        {/* A full page load on purpose: the site's own GTM container was
            skipped on this lab page and must load fresh on the site. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/">Back to analyticssojib.com</a>
      </footer>
    </div>
  );
}

/** Every dataLayer push the lab makes, newest first, as JSON. */
function Inspector() {
  const [pushes, setPushes] = useState<{ at: string; payload: unknown }[]>([]);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    // Pushes made before this mounted (the page view events) are in the log.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPushes(pushLog());
    const onPush = () => setPushes(pushLog());
    window.addEventListener(PUSH_EVENT, onPush);
    return () => window.removeEventListener(PUSH_EVENT, onPush);
  }, []);

  return (
    <div className="lab-inspector">
      <div className="lab-inspector__head">
        <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          dataLayer pushes ({pushes.length})
        </button>
        {pushes.length ? (
          <button type="button" onClick={() => setPushes([])}>
            Clear
          </button>
        ) : null}
      </div>
      {open ? (
        pushes.length ? (
          <ol className="lab-inspector__list">
            {pushes.map((push, i) => (
              <li key={i}>
                <span className="lab-inspector__time">{push.at}</span>
                <pre>{JSON.stringify(push.payload, null, 2)}</pre>
              </li>
            ))}
          </ol>
        ) : (
          <p className="lab-hint">Nothing pushed on this page yet.</p>
        )
      ) : null}
    </div>
  );
}
