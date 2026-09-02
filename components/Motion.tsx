"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { observeInView } from "@/lib/in-view";

/**
 * Scroll reveal for the public site.
 *
 * Three rules decided the shape of this:
 *
 * 1. NOTHING IS HIDDEN UNLESS THIS FILE RUNS. The CSS that hides a pending
 *    element is scoped to [data-motion="on"], which only this component sets.
 *    With JavaScript off, or before hydration, or under reduced motion, the
 *    page renders exactly as it did before — visible. A reveal animation that
 *    can strand content behind a failed script is not worth having.
 *
 * 2. REDUCED MOTION IS CHECKED FIRST AND EXITS. Not "collapse the duration to
 *    zero" — the attribute is never set, the elements are never hidden, and
 *    the observer is never built. There is no path where a person with the
 *    setting on gets a transform.
 *
 * 3. THE STAGGER IS PER ARRIVAL, NOT PER INDEX. Delay comes from how many
 *    elements arrived in the SAME frame, sorted top to bottom. Four cards in
 *    a row stagger; two case studies 1,400px apart both start immediately,
 *    because they arrive minutes apart. Indexing off document position
 *    instead would make the second case study sit blank for a beat for no
 *    reason a visitor could perceive.
 *
 * The arrival test itself lives in lib/in-view.ts, and it is deliberately not
 * an IntersectionObserver — see the note there for what that missed.
 */

const STEP_MS = 60;
const MAX_STEPS = 4;

export function Motion() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const main = document.querySelector("main");
    if (!main) return;

    const targets: HTMLElement[] = [];

    // Skip the first section. It is the hero: on screen before a visitor can
    // scroll, so fading it in is an animation that plays to nobody and delays
    // the one thing the page has to say.
    for (const section of [...main.children].slice(1) as HTMLElement[]) {
      for (const child of [...section.children] as HTMLElement[]) {
        // A grid of cards reveals as cards, not as one block.
        if (child.matches(".grid4, [data-stagger]")) {
          targets.push(...([...child.children] as HTMLElement[]));
        } else {
          targets.push(child);
        }
      }
    }

    if (targets.length === 0) return;

    document.documentElement.dataset.motion = "on";
    for (const el of targets) el.dataset.reveal = "pending";

    const stop = observeInView(targets, (batch) => {
      batch.forEach((el, i) => {
        el.style.setProperty("--reveal-delay", `${Math.min(i, MAX_STEPS) * STEP_MS}ms`);
        el.dataset.reveal = "shown";
      });
    });

    return () => {
      stop();
      delete document.documentElement.dataset.motion;
      for (const el of targets) {
        delete el.dataset.reveal;
        el.style.removeProperty("--reveal-delay");
      }
    };
  }, [pathname]);

  return null;
}
