import Link from "next/link";
import {
  pages,
  reviews,
  upworkReviewCount,
  upworkUrl,
  type Testimonial,
  type WrittenReview,
} from "@/content/site";
import { LiteYouTube } from "@/components/LiteYouTube";
import { WrittenReviews } from "@/components/sections/WrittenReviews";
import { Deck } from "@/components/ui/Deck";

/** Written reviews in the homepage rows. */
const HOME_WRITTEN = 10;

/**
 * The video reviews, then the written ones.
 *
 * The videos are a deck (components/ui/Deck.tsx): they arrive one after
 * another as the page scrolls, with nothing to click to get to the next. It
 * replaced a carousel with dots and arrows, which hid two of three videos
 * behind a control most visitors never touched.
 */
export function Reviews({
  items,
  written,
  all = false,
  home = false,
}: {
  items: Testimonial[];
  written: WrittenReview[];
  /** Every written review in full, as on /reviews. */
  all?: boolean;
  /** The homepage: the written reviews only as moving rows, and a link to
   *  /reviews for the rest. */
  home?: boolean;
}) {
  const N = items.length;
  // The homepage rows carry the first ten in the order set in the console;
  // every one of them is on /reviews. All twenty in the rows doubled the
  // section and, through the client props, the page payload with it.
  const rows = home
    ? written.filter((item) => !item.placeholder && item.quote.trim() !== "").slice(0, HOME_WRITTEN)
    : written;

  return (
    <section id="reviews" className="section section--raised" aria-labelledby="reviews-title">
      <div className="section-head">
        <span className="eyebrow eyebrow--muted">{reviews.kicker}</span>
      </div>

      <h2 id="reviews-title" className="h2" style={{ maxWidth: "26ch", margin: 0 }}>
        {reviews.title}
      </h2>

      {N > 0 ? (
        <Deck label="Video reviews">
          {items.map((item, i) => (
            <div key={item.id} className="review-slide">
              <div className="review-slide__media">
                <LiteYouTube
                  id={item.id}
                  label={`${item.label}, client video review ${i + 1} of ${N}, recorded on Upwork`}
                  client={item.name ?? item.title ?? "unnamed"}
                  orientation={item.orientation}
                  badge="VIDEO REVIEW"
                />
              </div>

              <div className="review-slide__body">
                <span className="review-slide__count" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")} / {String(N).padStart(2, "0")}
                </span>
                <span className="review-slide__verified">★★★★★ VERIFIED CLIENT</span>
                {/* No quote is invented. With a quote the client's words lead
                    and the name attributes them; without one the name leads
                    and the video speaks for itself. */}
                <p className="review-slide__lead">
                  {item.quote ?? item.name ?? item.title ?? reviews.unnamed}
                </p>
                <span className="review-slide__by">
                  {item.quote
                    ? [item.name, item.role].filter(Boolean).join(" · ")
                    : (item.role ?? reviews.note)}
                </span>
              </div>
            </div>
          ))}
        </Deck>
      ) : null}

      <WrittenReviews items={rows} all={all} moving={home} />

      {home ? (
        <div className="teaser__foot">
          <Link href="/reviews" className="btn btn-ghost">
            {pages.reviews.teaserLink}
          </Link>
        </div>
      ) : null}

      <p className="review-more">
        MORE REVIEWS ·{" "}
        <a href={upworkUrl} target="_blank" rel="noopener">
          {upworkReviewCount} ON UPWORK
        </a>
      </p>
    </section>
  );
}
