"use client";

import { useEffect } from "react";

import { prefersReducedMotion } from "@/lib/motion";

/**
 * A few pixels of depth on the hero diagram, following the pointer.
 *
 * It writes two custom properties, --px and --py, each from -1 to 1, onto the
 * element marked [data-hero-parallax]. The CSS decides what moves and how far,
 * so the distances live with the layout they belong to.
 *
 * It does nothing at all unless three things are true: the pointer is a mouse
 * (a finger has no hover position to follow), the screen is wide enough for
 * the diagram to sit beside the copy, and reduced motion is off. Renders
 * nothing either way.
 *
 * One listener on the hero rather than on the window, so it stops costing
 * anything the moment the pointer leaves the first screen.
 */
export function HeroParallax() {
  useEffect(() => {
    if (prefersReducedMotion()) return;
    if (!window.matchMedia("(pointer: fine) and (min-width: 1024px)").matches) return;

    const target = document.querySelector<HTMLElement>("[data-hero-parallax]");
    const hero = target?.closest<HTMLElement>(".hero");
    if (!target || !hero) return;

    let frame = 0;
    let x = 0;
    let y = 0;

    const apply = () => {
      frame = 0;
      target.style.setProperty("--px", x.toFixed(3));
      target.style.setProperty("--py", y.toFixed(3));
    };

    const onMove = (e: PointerEvent) => {
      const rect = hero.getBoundingClientRect();
      x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      if (!frame) frame = requestAnimationFrame(apply);
    };

    const onLeave = () => {
      x = 0;
      y = 0;
      if (!frame) frame = requestAnimationFrame(apply);
    };

    hero.addEventListener("pointermove", onMove, { passive: true });
    hero.addEventListener("pointerleave", onLeave, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      hero.removeEventListener("pointermove", onMove);
      hero.removeEventListener("pointerleave", onLeave);
      target.style.removeProperty("--px");
      target.style.removeProperty("--py");
    };
  }, []);

  // Whether the hero can be seen at all. The stylesheet pauses the pipeline's
  // animations while it cannot. This runs for every visitor, touch included,
  // and under reduced motion it is harmless: there is nothing to pause.
  useEffect(() => {
    const hero = document.querySelector<HTMLElement>(".hero");
    if (!hero) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) delete hero.dataset.offscreen;
      else hero.dataset.offscreen = "";
    });
    observer.observe(hero);
    return () => {
      observer.disconnect();
      delete hero.dataset.offscreen;
    };
  }, []);

  return null;
}
