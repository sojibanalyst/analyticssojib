"use client";

import { useEffect } from "react";

import { prefersReducedMotion, setLenis } from "@/lib/motion";

/**
 * Smooth scrolling for the public site, through Lenis.
 *
 * Four decisions, each of them a way this could have gone wrong:
 *
 * 1. REDUCED MOTION EXITS FIRST. Lenis is never downloaded, the class is never
 *    set, and the page scrolls exactly as the browser scrolls it.
 *
 * 2. IT IS NOT IN THE FIRST BUNDLE. The import is dynamic and starts after
 *    hydration, so the library costs nothing against the first paint. Until it
 *    arrives the page scrolls natively, which is a perfectly good scroll.
 *
 * 3. TOUCH DEVICES NEVER LOAD IT. A phone's own momentum scrolling is already
 *    smooth and is tuned by the platform; replacing it is how a site ends up
 *    feeling wrong in the hand. Lenis would leave touch alone anyway, so
 *    loading it there buys nothing and costs a per-frame callback.
 *
 * 4. A SCROLL LOCK STOPS IT. The mobile menu locks the page by setting
 *    overflow: hidden on <body>. That stops the browser scrolling, but Lenis
 *    scrolls with window.scrollTo, which ignores it, so the page would slide
 *    about underneath the open menu. Watching the style attribute is the one
 *    signal every current and future lock on this site shares.
 *
 * Renders nothing. Public pages only: the console is a tool, not a brochure.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (prefersReducedMotion()) return;

    // A mouse or a trackpad only. Lenis eases wheel input and leaves touch
    // alone, so on a phone it would smooth nothing, and it still runs a
    // callback on every frame to do it. Measured with Lighthouse on a
    // throttled phone profile, that loop was the largest script item on the
    // main thread: without it total blocking time fell from 200ms to 80ms.
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    let cancelled = false;
    let teardown = () => {};

    void import("lenis").then(({ default: Lenis }) => {
      if (cancelled) return;

      const lenis = new Lenis({
        autoRaf: true,
        lerp: 0.1,
        // In-page links ("/#services") ease to their target instead of jumping.
        anchors: true,
      });
      setLenis(lenis);

      const body = document.body;
      const syncLock = () => {
        if (body.style.overflow === "hidden") lenis.stop();
        else lenis.start();
      };
      const observer = new MutationObserver(syncLock);
      observer.observe(body, { attributes: true, attributeFilter: ["style"] });
      syncLock();

      teardown = () => {
        observer.disconnect();
        setLenis(null);
        lenis.destroy();
      };
    });

    return () => {
      cancelled = true;
      teardown();
    };
  }, []);

  return null;
}
