"use client";

import type Lenis from "lenis";

/**
 * The motion stack, in one place.
 *
 * Three things live here so that no component has to know about the other two:
 *
 *   1. The numbers. One easing, three durations. They mirror the --ease-out,
 *      --dur-* and --stagger tokens in app/globals.css by hand, because a GSAP
 *      timeline cannot read a custom property and CSS cannot read this file.
 *   2. The reduced-motion test. Every animated component asks this first and
 *      renders its static state when the answer is yes.
 *   3. The loaders. GSAP and ScrollTrigger are roughly 40 KB gzipped between
 *      them, so they are never in the first bundle: a section asks for them
 *      when it is about to need them, and every caller shares one request.
 */

/**
 * The site's one easing, in both dialects. cubic-bezier(0.22, 1, 0.36, 1) is
 * the quintic ease-out, which GSAP ships under the name "power4.out". GSAP
 * cannot parse a cubic-bezier() string without its CustomEase plugin, and this
 * is the same curve without the extra download.
 */
export const EASE_CSS = "cubic-bezier(0.22, 1, 0.36, 1)";
export const EASE_GSAP = "power4.out";

/** Seconds, because that is GSAP's unit. */
export const DUR = { micro: 0.24, reveal: 0.7 } as const;
export const STAGGER = 0.09;

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

type ScrollTriggerStatic = typeof import("gsap/ScrollTrigger").ScrollTrigger;
type Gsap = typeof import("gsap").gsap;

let lenis: Lenis | null = null;
let scrollTrigger: ScrollTriggerStatic | null = null;
let gsapPromise: Promise<{ gsap: Gsap; ScrollTrigger: ScrollTriggerStatic }> | null = null;

/**
 * Lenis moves the page on its own clock, so ScrollTrigger has to be told each
 * time it does or pinned sections lag a frame behind the scroll. Whichever of
 * the two arrives second makes the connection.
 */
function connect() {
  if (lenis && scrollTrigger) lenis.on("scroll", scrollTrigger.update);
}

/** Called by components/SmoothScroll.tsx. Null when smooth scrolling is off. */
export function setLenis(instance: Lenis | null) {
  lenis = instance;
  connect();
}

export function getLenis(): Lenis | null {
  return lenis;
}

/**
 * GSAP with ScrollTrigger registered. Resolves once and is shared.
 *
 * Do not call this under reduced motion. The caller's static fallback should
 * not cost the visitor a 40 KB download they will never see the result of.
 */
export function loadGsap() {
  gsapPromise ??= Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(
    ([core, plugin]) => {
      core.gsap.registerPlugin(plugin.ScrollTrigger);
      core.gsap.defaults({ ease: EASE_GSAP, duration: DUR.reveal });
      scrollTrigger = plugin.ScrollTrigger;
      connect();
      return { gsap: core.gsap, ScrollTrigger: plugin.ScrollTrigger };
    },
  );
  return gsapPromise;
}
