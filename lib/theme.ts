"use client";

import { useSyncExternalStore } from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "sf-theme";
const EVENT = "sf-theme-change";

export function getTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function setTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Private mode / storage disabled — the theme still applies for this page.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function toggleTheme(): void {
  setTheme(getTheme() === "dark" ? "light" : "dark");
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

/**
 * The server always renders the design's default (dark), so the server
 * snapshot is "dark" and the client corrects on mount. The pre-paint script in
 * layout.tsx has already set the attribute, so nothing visibly flashes.
 */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getTheme, () => "dark" as const);
}
