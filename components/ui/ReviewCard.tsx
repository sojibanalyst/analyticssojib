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
export function ReviewCard({ quote, attribution, verifiedLabel, clamp }: Props) {
  return (
    <figure className="rv-card" data-clamp={clamp || undefined}>
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
      <blockquote className="rv-card__quote">{quote}</blockquote>
      <figcaption className="rv-card__by">{attribution}</figcaption>
    </figure>
  );
}
