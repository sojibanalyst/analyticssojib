"use client";

import { useCallback, useSyncExternalStore } from "react";

import { announcement, whatsappUrl } from "@/content/site";

/**
 * One line above everything: what he does, and a way to start.
 *
 * The reference site runs a yellow strip here. This one is in the site's own
 * palette rather than a warning colour — an announcement bar in amber reads as
 * an outage notice, and the first thing a visitor sees should not look like
 * something has gone wrong.
 *
 * Dismissible, and the dismissal is read through useSyncExternalStore for the
 * same reason as the contact dock: sessionStorage is an external system, and
 * mirroring it into React state means one render with the wrong answer
 * followed by a correction. Session scope, not forever.
 *
 * It sits ABOVE the sticky header in the document and scrolls away with the
 * page. A second fixed strip would eat 40px of every screen for a sentence
 * that is only worth reading once.
 */

const KEY = "sf-announcement-dismissed";
const EVENT = "sf-announcement-dismiss";

let dismissedFallback = false;

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

function read(): boolean {
  if (dismissedFallback) return true;
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

// Server says "showing", so the bar is in the HTML and does not pop in after
// hydration and shove the page down.
const onServer = () => false;

export function AnnouncementBar() {
  const dismissed = useSyncExternalStore(subscribe, read, onServer);

  const dismiss = useCallback(() => {
    dismissedFallback = true;
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      // Private mode; the module flag carries it for this view.
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);

  if (dismissed) return null;

  return (
    <div className="announce">
      <p className="announce__text">
        {announcement.text}{" "}
        <a href={whatsappUrl} target="_blank" rel="noopener">
          {announcement.linkLabel}
        </a>
      </p>
      <button type="button" className="announce__dismiss" onClick={dismiss}>
        <span aria-hidden="true">✕</span>
        <span className="sr-only">Dismiss this notice</span>
      </button>
    </div>
  );
}
