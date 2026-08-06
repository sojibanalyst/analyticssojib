"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import {
  buildCalendlyUrl,
  readUtms,
  CALENDLY_URL,
  CALENDLY_WIDGET_CSS,
  CALENDLY_WIDGET_JS,
} from "@/lib/calendly";
import { useTheme } from "@/lib/theme";
import { contact } from "@/content/site";

/**
 * Inline scheduling embed. Nothing third-party ships in the initial bundle: an
 * IntersectionObserver waits until the contact section approaches the viewport,
 * and only then is widget.js requested (lazyOnload).
 *
 * The widget is initialised imperatively rather than relying on Calendly's
 * auto-scan, which only runs once when the script loads. Because the container
 * is rebuilt whenever the theme changes (so the widget re-reads its colours),
 * auto-scan alone would leave an empty box after a toggle.
 *
 * A plain link to the scheduling page is always rendered underneath, so booking
 * still works with JS off or if the script is blocked.
 */
export function CalendlyInline() {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const url = buildCalendlyUrl(theme, readUtms());

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      // No observer support: load anyway, but off the effect's render pass.
      const t = setTimeout(() => setNear(true), 0);
      return () => clearTimeout(t);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // (Re)build the widget once the script is ready, and again whenever the URL
  // changes — which is what a theme toggle does. `loaded` is driven by
  // next/script's onReady, which also fires if the popup button already
  // fetched widget.js.
  useEffect(() => {
    const host = widgetRef.current;
    if (!loaded || !host || !window.Calendly?.initInlineWidget) return;
    host.innerHTML = "";
    window.Calendly.initInlineWidget({ url, parentElement: host });
  }, [loaded, url]);

  return (
    <div ref={containerRef}>
      {near && (
        <>
          <link rel="stylesheet" href={CALENDLY_WIDGET_CSS} />
          <Script
            src={CALENDLY_WIDGET_JS}
            strategy="lazyOnload"
            onReady={() => setLoaded(true)}
          />
        </>
      )}

      {/* Height lives in CSS: Calendly fills its parent and scrolls inside it,
          so the box has to be tall enough for the layout Calendly picks at the
          current width — see .calendly-shell. */}
      <div
        ref={widgetRef}
        className="calendly-inline-widget calendly-shell"
        data-url={url}
        data-resize="true"
      />

      <p
        style={{
          margin: "12px 0 0",
          fontFamily: "var(--font-mono)",
          fontSize: "11.5px",
          letterSpacing: "0.06em",
          color: "var(--muted)",
        }}
      >
        {contact.fallback}{" "}
        <a href={CALENDLY_URL} target="_blank" rel="noopener">
          calendly.com/sojibh2001/30min
        </a>
      </p>
    </div>
  );
}
