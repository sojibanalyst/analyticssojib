"use client";

import { useEffect, useId, useState } from "react";

import { FilterList } from "@/components/FilterList";
import { pages, reviews, type WrittenReview } from "@/content/site";
import { REVIEW_FILTERS, groupsOf } from "@/lib/filters";
import { ReviewCard } from "@/components/ui/ReviewCard";

/**
 * The written reviews, built for many.
 *
 * WIDE SCREENS: two rows that drift in opposite directions. Each row's cards
 * are rendered twice so the loop has no seam, and the second copy is hidden
 * from screen readers and removed from the tab order. The rows stop while a
 * pointer is over them or while anything inside has focus, which is the rule
 * for content that moves on its own.
 *
 * PHONES: the same cards become one row you swipe. No second copy, no motion
 * of its own; scroll snapping does the settling.
 *
 * REDUCED MOTION: the rows do not drift at any width. They scroll sideways by
 * hand instead.
 *
 * EVERYWHERE: "Read all reviews" opens every review in full, in columns. The
 * moving rows clamp long quotes so the cards stay one height; the grid is
 * where nothing is cut.
 *
 * A placeholder row from the console is never rendered as a review. With no
 * real reviews at all, the whole block renders nothing.
 */
export function WrittenReviews({
  items,
  all = false,
  moving = false,
}: {
  items: WrittenReview[];
  /** Every review in full, as a grid: /reviews. */
  all?: boolean;
  /** Only the moving rows, with no "read all" toggle: the homepage, which
   *  links to /reviews instead. */
  moving?: boolean;
}) {
  const real = items.filter((item) => !item.placeholder && item.quote.trim() !== "");
  const [open, setOpen] = useState(false);
  const gridId = useId();

  /**
   * The second copy of each row exists only to close the loop, so it is only
   * rendered where there is a loop: a wide screen with motion allowed, and
   * only after hydration. In the server's HTML it would be every review a
   * second time, for every visitor, including the phones that never show it.
   * The drift is switched on by the same flag, so a row never starts moving
   * before the copy that makes it seamless is there.
   */
  const [loop, setLoop] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px) and (prefers-reduced-motion: no-preference)");
    const sync = () => setLoop(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  if (!real.length) return null;

  // Alternate cards between the rows, so each row gets a mix of long and short
  // rather than the first ten and the last ten.
  const rows = [real.filter((_, i) => i % 2 === 0), real.filter((_, i) => i % 2 === 1)].filter(
    (row) => row.length > 0,
  );

  const card = (item: WrittenReview, clamp: boolean) => (
    <ReviewCard
      quote={item.quote}
      attribution={item.attribution}
      verifiedLabel={reviews.verified}
      clamp={clamp}
    />
  );

  // On /reviews every review is the point of the page: all of them, in
  // columns, filterable by the service they mention, each cut at five lines
  // with a "Read more" where it is longer. Nothing moves.
  if (all) {
    return (
      <div className="rv">
        <h3 className="rv__title">{reviews.writtenTitle}</h3>
        <FilterList
          entries={real.map((item) => ({
            key: item.attribution + item.quote.slice(0, 24),
            groups: groupsOf(`${item.attribution} ${item.quote}`, REVIEW_FILTERS),
            node: (
              <ReviewCard
                quote={item.quote}
                attribution={item.attribution}
                verifiedLabel={reviews.verified}
                expandable={{ more: reviews.readMore, less: reviews.readLess }}
              />
            ),
          }))}
          order={REVIEW_FILTERS.map((rule) => rule.label)}
          label={pages.reviews.filterLabel}
          allLabel={pages.reviews.filterAll}
          showingLabel={pages.reviews.filterShowing}
          listClassName="masonry"
        />
      </div>
    );
  }

  return (
    <div className="rv">
      <h3 className="rv__title">{reviews.writtenTitle}</h3>

      <div
        className="rv-rows"
        role="group"
        aria-label={reviews.writtenTitle}
        data-loop={loop || undefined}
      >
        {rows.map((row, r) => (
          <div
            key={r}
            className="rv-row"
            data-dir={r % 2 === 0 ? "left" : "right"}
            // Speed follows length, so a row of ten does not race past at the
            // pace that suits a row of three.
            style={{ ["--rv-duration" as string]: `${Math.max(row.length * 9, 30)}s` }}
          >
            <ul className="rv-track">
              {row.map((item) => (
                <li key={item.attribution + item.quote.slice(0, 24)} className="rv-item">
                  {card(item, true)}
                </li>
              ))}
              {loop &&
                row.map((item) => (
                <li
                  key={`copy-${item.attribution + item.quote.slice(0, 24)}`}
                  className="rv-item rv-item--copy"
                  aria-hidden="true"
                  inert
                >
                  {card(item, true)}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {moving ? null : (
      <div className="rv__more">
        <button
          type="button"
          className="btn btn-ghost"
          aria-expanded={open}
          aria-controls={gridId}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? reviews.hideAll : `${reviews.readAll} (${real.length})`}
        </button>
      </div>
      )}

      {moving ? null : (
      <div id={gridId} className="rv-grid" hidden={!open}>
        {open
          ? real.map((item) => (
              <div key={item.attribution + item.quote.slice(0, 24)} className="rv-grid__item">
                {card(item, false)}
              </div>
            ))
          : null}
      </div>
      )}
    </div>
  );
}
