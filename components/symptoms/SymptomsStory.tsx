"use client";

import { useEffect, useRef, useState } from "react";

import { symptoms } from "@/content/site";
import { loadGsap, prefersReducedMotion } from "@/lib/motion";

import { MismatchDashboard } from "./MismatchDashboard";

/**
 * "Does this look familiar?" as a scroll story.
 *
 * A dashboard with three numbers that disagree, four cards that say why, and
 * at the end the three numbers settling on one.
 *
 * THREE MODES, decided once on mount:
 *
 *   pinned   A mouse-sized screen with motion allowed. The panel sticks while
 *            the section scrolls past, the cards arrive one at a time, and the
 *            numbers reconcile at the end.
 *   flow     A phone, or a short window. Nothing sticks. Each card reveals as
 *            it arrives and the numbers reconcile when the last one is on
 *            screen.
 *   static   Reduced motion. Everything is visible and the dashboard is drawn
 *            already reconciled, with each old figure kept beside the new one,
 *            so the before and the after are both there to read.
 *
 * THE PIN IS CSS, NOT A SCRIPT. `position: sticky` inside a section whose
 * height is set in the stylesheet. A scripted pin inserts a spacer after the
 * library loads, which moves everything below it; this way the height is in
 * the first paint and nothing ever shifts. ScrollTrigger is only asked one
 * question: how far through the section are we?
 *
 * Before any of this runs, and if it never does, every card is visible and
 * the dashboard shows the mismatch. Nothing is hidden unless this file ran.
 */

type Mode = "pending" | "pinned" | "flow" | "static";

const CARDS = symptoms.items.length;

/** Scroll progress at which the numbers settle. The cards share what is before it. */
const RECONCILE_AT = 0.8;

export function SymptomsStory() {
  const sectionRef = useRef<HTMLElement>(null);

  const [mode, setMode] = useState<Mode>("pending");
  const [shown, setShown] = useState(CARDS);
  const [reconciled, setReconciled] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    if (prefersReducedMotion()) {
      // An effect is the only place the media query can be read; the server
      // render cannot know it.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMode("static");
      setReconciled(true);
      return;
    }

    const pinnable = window.matchMedia(
      "(min-width: 1024px) and (min-height: 680px) and (pointer: fine)",
    );

    if (!pinnable.matches) {
      setMode("flow");
      setShown(0);

      const cards = [...section.querySelectorAll<HTMLElement>(".story__card")];
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const index = cards.indexOf(entry.target as HTMLElement);
            // Never backwards: a card that has arrived stays arrived.
            setShown((n) => Math.max(n, index + 1));
            if (index === CARDS - 1) setReconciled(true);
            observer.unobserve(entry.target);
          }
        },
        { threshold: 0.5 },
      );
      for (const card of cards) observer.observe(card);
      return () => observer.disconnect();
    }

    // Pinned. The library is fetched when the section is about a screen away,
    // not on page load: most visits never need it in the first second.
    let cancelled = false;
    let kill = () => {};

    const arm = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        arm.disconnect();

        void loadGsap().then(({ ScrollTrigger }) => {
          if (cancelled) return;

          setMode("pinned");
          setShown(0);

          const trigger = ScrollTrigger.create({
            trigger: section,
            start: "top top",
            end: "bottom bottom",
            onUpdate: (self) => {
              const p = self.progress;
              // The cards are spread over the stretch before the reconcile
              // point, with the first one arriving almost at once.
              setShown(Math.min(CARDS, Math.floor((p / RECONCILE_AT) * CARDS + 0.6)));
              setReconciled(p >= RECONCILE_AT);
            },
          });

          kill = () => trigger.kill();
        });
      },
      { rootMargin: "100% 0px" },
    );
    arm.observe(section);

    return () => {
      cancelled = true;
      arm.disconnect();
      kill();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="section section--sunk story"
      aria-labelledby="symptoms-title"
      data-mode={mode}
    >
      <div className="story__pin">
        <div className="section-head">
          <span className="eyebrow">{symptoms.eyebrow}</span>
          <h2 id="symptoms-title" className="h2">
            {symptoms.title}
          </h2>
        </div>

        <div className="story__layout">
          <MismatchDashboard reconciled={reconciled} animate={mode !== "static"} />

          {/* A list: four problems, in an order. data-on reveals each one, in
              both moving modes; the site-wide reveal is kept off these so the
              two never animate the same card. */}
          <ol className="story__cards">
            {symptoms.items.map((item, i) => (
              <li
                key={item.title}
                className="card story__card"
                data-on={i < shown}
              >
                <span className="story__tag">{item.tag}</span>
                <h3 className="story__title">{item.title}</h3>
                <p className="story__body">{item.body}</p>
              </li>
            ))}
          </ol>

          {/* Where nothing is pinned, the dashboard has scrolled off the top by
              the time the last card arrives, so the ending would happen out of
              sight. This repeats it underneath the cards. Hidden from screen
              readers: the dashboard's own status line already announced it. */}
          <p className="story__end" data-on={reconciled} aria-hidden="true">
            <span className="story__end-label">{symptoms.dashboard.reconciled}</span>
            {symptoms.dashboard.tiles.map((tile) => (
              <span key={tile.source} className="story__end-item">
                {tile.source}{" "}
                <b>
                  {symptoms.dashboard.currency}
                  {symptoms.dashboard.truth.toLocaleString("en-US")}
                </b>
              </span>
            ))}
          </p>
        </div>
      </div>
    </section>
  );
}
