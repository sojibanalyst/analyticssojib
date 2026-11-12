import Image from "next/image";
import Link from "next/link";

import { work, type CaseStudy } from "@/content/site";
import { hasMetric } from "@/lib/case-study";

/**
 * The case studies as an index: the first one large, with its screenshot
 * beside it, and the rest as a grid of cards underneath. Every card is one
 * link to the page that has the whole write-up.
 *
 * It replaced a list of full-size case files, each with its stats and its
 * gallery, which was the detail page five times over on one screen.
 *
 * WHAT A CARD SHOWS WHERE A SCREENSHOT WOULD GO. The first screenshot, when
 * the case has one. When it has none, the figure the case itself carries, in
 * large type: never a stock picture and never a number that is not in the case.
 */

/** "CASE_007 / SHOPIFY / UK / SKINCARE" becomes "SHOPIFY / UK / SKINCARE". */
const category = (code: string) => code.split(" / ").slice(1).join(" / ") || code;

/**
 * The one line under a card: the before and after where both exist, the
 * caption where not. A card with no screenshot already shows its caption in
 * the picture's place, so there the line is the invitation to read instead of
 * the same words twice.
 */
function result(item: CaseStudy): string {
  const caption = item.metric.caption;
  if (hasMetric(item.metric)) {
    const what = caption.split(" · ")[0];
    return `${item.metric.before} → ${item.metric.after}${what ? ` ${what}` : ""}`;
  }
  return item.screenshots.length && caption ? caption : work.readMore.replace(" →", "");
}

function Media({ item, sizes }: { item: CaseStudy; sizes: string }) {
  const shot = item.screenshots[0];
  if (shot) {
    // Empty alt: the card is one link and its title is the name of the thing.
    return <Image className="cs__img" src={shot.src} alt="" fill sizes={sizes} />;
  }
  return (
    <span className="cs__figure" aria-hidden="true">
      {hasMetric(item.metric) ? (
        <>
          <span className="cs__figure-value">{item.metric.after}</span>
          <span className="cs__figure-label">{item.metric.caption}</span>
        </>
      ) : (
        <span className="cs__figure-label cs__figure-label--only">{item.metric.caption || item.code}</span>
      )}
    </span>
  );
}

export function CaseIndex({ cases }: { cases: CaseStudy[] }) {
  const [first, ...rest] = cases;
  if (!first) return null;
  return (
    <div className="cs">
      <Link href={`/case-studies/${first.slug}`} className="cs__card cs__card--feature">
        <span className="cs__media">
          <Media item={first} sizes="(min-width: 900px) 700px, 100vw" />
        </span>
        <span className="cs__text">
          <span className="cs__tag">{category(first.code)}</span>
          <span className="cs__title cs__title--feature">{first.title}</span>
          <span className="cs__body">{first.body}</span>
          <span className="cs__foot">
            <span className="cs__go">
              {work.readMore.replace(" →", "")} <span aria-hidden="true">→</span>
            </span>
            <span className="cs__result">{result(first)}</span>
          </span>
        </span>
      </Link>

      {rest.length ? (
        <ul className="cs__grid">
          {rest.map((item) => (
            <li key={item.slug}>
              <Link href={`/case-studies/${item.slug}`} className="cs__card">
                <span className="cs__media">
                  <Media item={item} sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw" />
                </span>
                <span className="cs__text">
                  <span className="cs__tag cs__tag--plain">{category(item.code)}</span>
                  <span className="cs__title">{item.title}</span>
                  <span className="cs__body">{item.body}</span>
                  <span className="cs__foot">
                    <span className="cs__result">{result(item)}</span>
                    <span className="cs__arrow" aria-hidden="true">
                      →
                    </span>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
