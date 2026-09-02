/**
 * "Tell me when these elements have come into view, in the order they got
 * there" — with no way for one to be missed.
 *
 * This started as an IntersectionObserver and the first measurement caught it
 * out: sweeping the homepage top to bottom revealed 11 elements out of 45.
 * IntersectionObserver reports THRESHOLD CROSSINGS evaluated once per frame,
 * so an element that goes from below the viewport to above it between two
 * frames — a flick scroll, a jump to an anchor, a scroll restored on reload —
 * crosses nothing and never reports. With a reveal animation attached, those
 * elements stay at opacity 0 for the rest of the visit.
 *
 * Content stranded invisible by its own entrance animation is worse than no
 * animation, so the test here is a position, not a crossing: has this element
 * reached the trigger line, or gone past it. Something scrolled clean over
 * still counts as arrived.
 *
 * The work is a rect read per pending element per animation frame while the
 * page is actually scrolling, and the listeners detach the moment the last
 * element has arrived — on a page that has been read to the bottom this costs
 * nothing at all.
 */

/** Fires when an element's top has reached 92% of the viewport height: far
 *  enough in to be properly in frame, not merely touching the bottom edge. */
const TRIGGER = 0.92;

export function observeInView(
  elements: HTMLElement[],
  onArrive: (batch: HTMLElement[]) => void,
): () => void {
  let pending = [...elements];
  let frame = 0;
  let stopped = false;

  const check = () => {
    frame = 0;
    if (stopped || pending.length === 0) return;

    const line = window.innerHeight * TRIGGER;
    const arrived: HTMLElement[] = [];
    const still: HTMLElement[] = [];

    for (const el of pending) {
      (el.getBoundingClientRect().top < line ? arrived : still).push(el);
    }

    if (arrived.length > 0) {
      // Top to bottom, so a stagger runs down the page rather than in
      // whatever order the elements happen to sit in the array.
      arrived.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
      pending = still;
      onArrive(arrived);
    }

    if (pending.length === 0) stop();
  };

  const schedule = () => {
    if (frame === 0 && !stopped) frame = requestAnimationFrame(check);
  };

  function stop() {
    stopped = true;
    if (frame !== 0) cancelAnimationFrame(frame);
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
  }

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  check();

  return stop;
}
