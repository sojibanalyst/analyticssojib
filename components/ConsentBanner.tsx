"use client";

import { useEffect, useRef } from "react";
import { DENIED, GRANTED, setConsent, useHasChosen } from "@/lib/consent";
import { consent as copy } from "@/content/site";

/**
 * The consent banner.
 *
 * Two rules it is built around, both of them legal rather than aesthetic:
 *
 *  1. Refusing must be exactly as easy as accepting. Both buttons are the
 *     same size, in the same row, with the same weight — no greyed-out
 *     "Reject", no extra click to find it.
 *  2. Nothing is set until one of them is pressed. Dismissing the banner is
 *     not consent, so there is no dismiss button.
 *
 * It renders nothing at all until the client has read the cookie, because the
 * server cannot know the answer: prerendering it visible would flash the
 * banner at everyone who already answered.
 */
export function ConsentBanner() {
  const chosen = useHasChosen();
  const acceptRef = useRef<HTMLButtonElement>(null);

  // Move focus into the banner when it appears. It is the first thing a
  // keyboard or screen-reader user needs to deal with, and without this the
  // tab order would walk them through the whole page to reach it.
  useEffect(() => {
    if (!chosen) acceptRef.current?.focus();
  }, [chosen]);

  if (chosen) return null;

  return (
    <div
      className="consent"
      role="dialog"
      aria-modal="false"
      aria-labelledby="consent-title"
      aria-describedby="consent-body"
    >
      <div className="consent__inner">
        <div className="consent__text">
          <p id="consent-title" className="consent__title">
            {copy.title}
          </p>
          <p id="consent-body" className="consent__body">
            {copy.body}
          </p>
        </div>

        <div className="consent__actions">
          <button
            type="button"
            className="consent__btn"
            onClick={() => setConsent(DENIED)}
          >
            {copy.reject}
          </button>
          <button
            ref={acceptRef}
            type="button"
            className="consent__btn consent__btn--primary"
            onClick={() => setConsent(GRANTED)}
          >
            {copy.accept}
          </button>
        </div>
      </div>
    </div>
  );
}
