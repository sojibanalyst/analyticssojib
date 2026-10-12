"use client";

import { useSyncExternalStore } from "react";

export type Theme = "dark" | "light";

/**
 * Bumped again, from "sf-theme-2", when dark became the default in the 2026
 * redesign. Under the light-default build the bootstrap wrote nothing unless a
 * visitor toggled, but anyone who toggled to dark and back has "light" saved,
 * and would never see the new default. A new key retires those values once
 * and lands everyone on dark.
 */
const STORAGE_KEY = "sf-theme-3";
const EVENT = "sf-theme-change";

export function getTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

/**
 * How long the cross-fade between themes runs. Kept in step with the
 * [data-theme-anim] rule in app/components.css by hand — the CSS cannot read
 * this constant, and a timer that outlives the transition would leave every
 * element on the page carrying a transition it does not need.
 */
const SWITCH_MS = 240;
let switchTimer: ReturnType<typeof setTimeout> | undefined;

export function setTheme(theme: Theme): void {
  const root = document.documentElement;

  /**
   * The whole page changes colour at once, so without this the switch is a
   * hard cut. The transition is applied for the length of the switch and then
   * removed, rather than living permanently on every element: a standing
   * `transition: background-color` would also animate hover states, reveals
   * and anything else that happens to change a colour.
   *
   * Reduced motion is handled HERE, by not opting in, rather than by letting
   * the global reduce block fight this rule with duelling !important
   * declarations. If the setting is on, the theme simply switches.
   */
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    root.dataset.themeAnim = "";
    clearTimeout(switchTimer);
    switchTimer = setTimeout(() => {
      delete root.dataset.themeAnim;
    }, SWITCH_MS);
  }

  root.dataset.theme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Private mode / storage disabled — the theme still applies for this page.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function toggleTheme(): void {
  setTheme(getTheme() === "light" ? "dark" : "light");
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

/**
 * The server always renders the default (dark), so the server snapshot is
 * "dark" and the client corrects on mount. The pre-paint script in layout.tsx
 * has already set the attribute, so nothing visibly flashes.
 */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getTheme, () => "dark" as const);
}
