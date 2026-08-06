import { site } from "@/content/site";
import type { Theme } from "@/lib/theme";

export const CALENDLY_URL = site.calendly;
export const CALENDLY_WIDGET_JS =
  "https://assets.calendly.com/assets/external/widget.js";
export const CALENDLY_WIDGET_CSS =
  "https://assets.calendly.com/assets/external/widget.css";

/**
 * Widget colours, per theme. Calendly wants 6-character hex without the '#'.
 *
 * These three values are the ONLY thing controllable inside the embed — it is
 * a cross-origin iframe, so its interior CSS cannot be reached. Everything
 * else (day-cell styling, borders, the Calendly ribbon) is theirs.
 *
 * `background` MUST equal --calendly-surface in globals.css, or a seam appears
 * between the panel and the embed.
 *
 * Why the dark background is lifted rather than being --surface exactly:
 * Calendly derives its secondary text — host name, day names, unavailable
 * dates — by fading `text` toward `background`. On the near-black --surface
 * those faded steps collapsed into the surface and the widget became
 * unreadable. #1a1d23 gives them somewhere to land while still reading as
 * part of the palette, and the brand accent still clears AA on it at 5.06:1.
 */
const PALETTE: Record<Theme, { background: string; text: string; primary: string }> =
  {
    // primary is the exact brand accent — no lightening needed at 5.06:1.
    dark: { background: "1a1d23", text: "ffffff", primary: "ff4a3d" },
    // light maps 1:1 onto --surface / --text / --accent.
    light: { background: "ffffff", text: "0a0a0b", primary: "0f7a3d" },
  };

const UTM_KEYS = [
  ["utm_source", "utm_source"],
  ["utm_medium", "utm_medium"],
  ["utm_campaign", "utm_campaign"],
  ["utm_content", "utm_content"],
  ["utm_term", "utm_term"],
] as const;

/** Read UTM params off the current URL so they reach Calendly's booking record. */
export function readUtms(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const out: Record<string, string> = {};
  for (const [from, to] of UTM_KEYS) {
    const v = params.get(from);
    if (v) out[to] = v;
  }
  return out;
}

/** Build the scheduling URL with theme colours, GDPR banner off, and UTMs. */
export function buildCalendlyUrl(theme: Theme, extra: Record<string, string> = {}) {
  const url = new URL(CALENDLY_URL);
  const colors = PALETTE[theme];
  url.searchParams.set("hide_gdpr_banner", "1");
  url.searchParams.set("background_color", colors.background);
  url.searchParams.set("text_color", colors.text);
  url.searchParams.set("primary_color", colors.primary);
  for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v);
  return url.toString();
}

type CalendlyGlobal = {
  initPopupWidget: (opts: { url: string }) => void;
  initInlineWidget?: (opts: { url: string; parentElement: HTMLElement }) => void;
};

declare global {
  interface Window {
    Calendly?: CalendlyGlobal;
  }
}

let loader: Promise<void> | null = null;

/** Load widget.js once, on demand. Resolves when window.Calendly exists. */
export function loadCalendly(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Calendly) return Promise.resolve();
  if (loader) return loader;

  loader = new Promise<void>((resolve, reject) => {
    if (!document.querySelector(`link[href="${CALENDLY_WIDGET_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = CALENDLY_WIDGET_CSS;
      document.head.appendChild(link);
    }

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${CALENDLY_WIDGET_JS}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("calendly")));
      return;
    }

    const script = document.createElement("script");
    script.src = CALENDLY_WIDGET_JS;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loader = null;
      reject(new Error("calendly"));
    };
    document.head.appendChild(script);
  });

  return loader;
}
