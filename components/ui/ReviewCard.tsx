"use client";

import { useEffect, useId, useRef, useState } from "react";

import { SocialIcon } from "@/components/ui/Icon";

type Props = {
  /** The client's own words, verbatim. */
  quote: string;
  attribution: string;
  /** The line under the stars. */
  verifiedLabel: string;
  /**
   * Cut the quote off after a few lines. Used in the moving rows, where one
   * very long review would otherwise make a card three times the height of
   * its neighbours. The full text is always in the "all reviews" grid.
   */
  clamp?: boolean;
  /**
   * Cut the quote at five lines with a "Read more" that opens it in place,
   * as on /reviews. The button appears only when the quote is actually cut.
   */
  expandable?: { more: string; less: string };
};

/**
 * One written review: stars, the quote, who said it, and where it can be
 * checked.
 *
 * The stars are drawn for sighted readers and written out once for everyone
 * else. Five, always: the written reviews published here are the five-star
 * ones from the Upwork profile, as supplied by Sojib. If a review with a lower
 * rating is ever published, this needs the `rating` column, not a guess.
 */
export function ReviewCard({ quote, attribution, verifiedLabel, clamp, expandable }: Props) {
  const quoteRef = useRef<HTMLQuoteElement>(null);
  const quoteId = useId();
  const [open, setOpen] = useState(false);
  const [cut, setCut] = useState(false);

  useEffect(() => {
    const el = quoteRef.current;
    if (!expandable || !el) return;
    const measure = () => setCut(el.scrollHeight > el.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [expandable]);

  return (
    <figure
      className="rv-card"
      data-clamp={clamp || undefined}
      data-expandable={(expandable && !open) || undefined}
    >
      <div className="rv-card__top">
        <span className="rv-card__stars" aria-hidden="true">
          ★★★★★
        </span>
        <span className="sr-only">5 out of 5 stars.</span>
        <span className="rv-card__verified">
          <SocialIcon name="upwork" size={13} />
          {verifiedLabel}
        </span>
      </div>
      <blockquote ref={quoteRef} id={quoteId} className="rv-card__quote">
        {quote}
      </blockquote>
      {expandable && (cut || open) ? (
        <button
          type="button"
          className="rv-card__more"
          aria-expanded={open}
          aria-controls={quoteId}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? expandable.less : expandable.more}
        </button>
      ) : null}
      <figcaption className="rv-card__by">{attribution}</figcaption>
    </figure>
  );
}
