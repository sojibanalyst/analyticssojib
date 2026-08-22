"use client";

import { useCallback, useState } from "react";
import { buildCalendlyUrl, loadCalendly, readUtms } from "@/lib/calendly";
import { useTheme } from "@/lib/theme";
import { track } from "@/lib/track";

type Props = {
  children: React.ReactNode;
  className?: string;
  /** Which button on the page this is — hero, header, contact. */
  placement?: string;
};

/**
 * Renders as a real anchor to the Calendly page, so it works with JavaScript
 * off and is announced as a link. When JS is available the click is
 * intercepted, widget.js is fetched on first use, and the popup opens instead.
 * If the script fails to load the browser simply follows the href.
 */
export function CalendlyPopupButton({ children, className, placement }: Props) {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);

  const onClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      // The intent is the same whether the popup opens or the link is followed
      // in a new tab, so this fires before the modifier check rather than
      // after it. Counting only the clicks that happen to open a popup would
      // undercount the thing the whole site is for.
      track("book_call_click", { placement: placement ?? "unknown" });

      // Let modified clicks (new tab, etc.) behave normally.
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      setLoading(true);

      /**
       * Ask /book for a reference before opening the widget.
       *
       * Calendly has no field for a click id — its tracking object is exactly
       * six UTM-ish keys — so the attribution stays on this side and Calendly
       * is given an opaque reference in utm_content. /book writes the row and
       * returns the URL to open; the webhook joins the reference back.
       *
       * If that call fails the widget still opens, without a reference, and
       * the booking is recorded with attribution "unknown". Losing a campaign
       * name is worth less than losing a booking.
       */
      fetch("/book?format=json", { headers: { accept: "application/json" } })
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null)
        .then(async (data: { url?: string } | null) => {
          await loadCalendly();
          const url = data?.url ?? buildCalendlyUrl(theme, readUtms());
          // The theme colours live in buildCalendlyUrl; /book returns the
          // scheduling URL with the tracking on it, so the two are merged.
          const merged = new URL(buildCalendlyUrl(theme));
          for (const [k, v] of new URL(url).searchParams) {
            if (k.startsWith("utm_")) merged.searchParams.set(k, v);
          }
          window.Calendly?.initPopupWidget({ url: merged.toString() });
        })
        .catch(() => {
          // Script blocked or offline — fall back to the server route, which
          // redirects and still records the intent.
          window.location.href = "/book";
        })
        .finally(() => setLoading(false));
    },
    [theme, placement],
  );

  return (
    <a
      href="/book"
      onClick={onClick}
      className={className}
      data-placement={placement}
      aria-busy={loading || undefined}
      rel="noopener"
    >
      {children}
    </a>
  );
}
