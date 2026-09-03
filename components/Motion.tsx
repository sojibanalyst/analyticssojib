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
    const GROUP = ".grid4, [data-stagger]";

    // Skip the first section. It is the hero: on screen before a visitor can
    // scroll, so fading it in is an animation that plays to nobody and delays
    // the one thing the page has to say.
    const sections = [...main.children].slice(1) as HTMLElement[];

    // A group of cards reveals as cards, not as one block — and the group can
    // sit at any depth. The written-review carousel is two levels down inside
    // the reviews section, so a direct-children-only scan animated the whole
    // carousel as a single lump and the cards inside it never moved.
    // ...but a grid INSIDE a card is a layout, not a group of things to
    // stagger. The stat tiles in a case card matched .grid4, which promoted
    // them to targets and demoted the card itself — so the tiles animated
    // inside a card that never moved. A group only counts if no card contains
    // it.
    const groups = sections
      .flatMap((s) => [...s.querySelectorAll<HTMLElement>(GROUP)])
      .filter((g) => !g.closest(".card, .case-card"));

    for (const group of groups) targets.push(...([...group.children] as HTMLElement[]));

    // Everything else at section level, as long as it is not a qualifying
    // group and does not contain one — animating an ancestor and its group
    // children both is how nested elements end up with two animations running
    // over each other.
    const isGroup = new Set(groups);
    const containsGroup = (el: HTMLElement) => groups.some((g) => el.contains(g));

    for (const section of sections) {
      for (const child of [...section.children] as HTMLElement[]) {
        if (isGroup.has(child) || containsGroup(child)) continue;
        targets.push(child);
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

    /**
     * A second, separate list: elements that animate themselves on arrival
     * rather than being faded in. The case-study metric bars are the only ones
     * so far. They are marked in their own markup rather than discovered by
     * position, because they are nested deep inside a card and are nothing to
     * do with the section-level rhythm above.
     */
    const marks = [...document.querySelectorAll<HTMLElement>('[data-inview="pending"]')];
    const stopMarks = observeInView(marks, (batch) => {
      for (const el of batch) el.dataset.inview = "shown";
    });

    return () => {
      stop();
      stopMarks();
      for (const el of marks) el.dataset.inview = "pending";
      delete document.documentElement.dataset.motion;
      for (const el of targets) {
        delete el.dataset.reveal;
        el.style.removeProperty("--reveal-delay");
      }
    };
  }, [pathname]);

  return null;
}
