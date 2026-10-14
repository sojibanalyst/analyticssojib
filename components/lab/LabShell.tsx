"use client";

import { useEffect, useState } from "react";

import { PUSH_EVENT, pushLog, readCart } from "@/lib/lab/store";

/**
 * The lab's frame: a header, the "demo store" notice, which GTM container is
 * loaded, and the dataLayer inspector.
 *
 * CONTAINER: the site's real GTM container never runs on /lab (see
 * components/GoogleTagManager.tsx). The lab's own container is set on
 * /admin/settings and rendered by app/lab/layout.tsx; this only says which.
 *
 * Links between lab pages are plain <a>, so each page is a full load and fires
 * its own page view, like a classic store.
 */
export function LabShell({ children, container }: { children: React.ReactNode; container: string | null }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const sync = () => setCount(readCart().reduce((n, l) => n + l.quantity, 0));
    sync();
    window.addEventListener("lab:cart", sync);
    return () => window.removeEventListener("lab:cart", sync);
  }, []);

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
        <div className="lab-gtm">
          <p className="lab-gtm__title">GTM container</p>
          <p className="lab-hint">
            {container
              ? `Loaded: ${container}. Set on /admin/settings, under Tracking lab.`
              : "None. Set the lab's container on /admin/settings, under Tracking lab. Events still go to window.dataLayer."}
          </p>
        </div>
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
