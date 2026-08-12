"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether the console sidebar is collapsed.
 *
 * Deliberately shaped like lib/theme.ts: an external store read through
 * useSyncExternalStore, not useState plus an effect. localStorage does not
 * exist on the server, so an effect would have to correct the state after the
 * first paint — which is a visible reflow and a lint error, in that order.
 */
const STORAGE_KEY = "sf-admin-collapsed";
const EVENT = "sf-admin-collapse-change";

/** Fallback when storage is unavailable, so the toggle still works per page. */
let memory = false;

export function getCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return memory;
  }
}

export function toggleCollapsed(): void {
  const next = !getCollapsed();
  memory = next;
  try {
    localStorage.setItem(STORAGE_KEY, String(next));
  } catch {
    // Private mode. It stops persisting across loads, not working.
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

/** Expanded on the server, corrected on hydration. Only affects /admin. */
export function useCollapsed(): boolean {
  return useSyncExternalStore(subscribe, getCollapsed, () => false);
}
