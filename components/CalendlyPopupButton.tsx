"use client";

import { useCallback, useState } from "react";
import { buildCalendlyUrl, loadCalendly, readUtms, CALENDLY_URL } from "@/lib/calendly";
import { useTheme } from "@/lib/theme";

type Props = {
  children: React.ReactNode;
  className?: string;
  /** Where this button sits — kept for the tracking plan wiring later. */
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
      // Let modified clicks (new tab, etc.) behave normally.
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      setLoading(true);
      loadCalendly()
        .then(() => {
          window.Calendly?.initPopupWidget({
            url: buildCalendlyUrl(theme, readUtms()),
          });
        })
        .catch(() => {
          // Script blocked or offline — fall back to the plain scheduling page.
          window.location.href = CALENDLY_URL;
        })
        .finally(() => setLoading(false));
    },
    [theme],
  );

  return (
    <a
      href={CALENDLY_URL}
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
