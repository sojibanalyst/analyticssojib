import Image from "next/image";
import Link from "next/link";
import { upworkUrl, work, type CaseStudy } from "@/content/site";
import type { PortfolioItem } from "@/lib/content";
import { CountValue } from "@/components/CountValue";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CaseGallery } from "@/components/sections/CaseGallery";
import { BeforeAfter } from "@/components/sections/BeforeAfter";
import { canClaimReconciliation, hasFigures, hasMetric } from "@/lib/case-study";

/** The design's image slot: a gallery once screenshots exist, a labelled drop
 *  zone until then — never a broken image. */
function Screenshot({ item }: { item: CaseStudy }) {
  if (!item.screenshots.length) {
    return (
      <div className="case-shot case-shot--empty" aria-hidden="true">
        <span className="case-shot__icon">▤</span>
        <span>{work.screenshotPending}</span>
      </div>
    );
  }
  return <CaseGallery shots={item.screenshots} label={item.title} />;
}

/** Case studies shown at full size. Any beyond this get the compact card. */
const FULL_CASES = 2;

/** How many of the smaller cards show before the "show all" disclosure. */
const MORE_VISIBLE = 9;

function ProjectCard({ item, index }: { item: PortfolioItem; index?: number }) {
  return (
    <Link className="more-card" href={`/work/${item.slug}`} data-featured={item.featured || undefined}>
      {item.images[0] ? (
        <Image
          className="more-card__cover"
          src={item.images[0].src}
          alt=""
          width={item.images[0].width}
          height={item.images[0].height}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          loading="lazy"
        />
      ) : null}
      <span className="more-card__top">
        {index !== undefined ? (
          <span className="more-card__index" aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
          </span>
        ) : null}
        {item.videoId ? <span className="more-card__video">{work.videoMark}</span> : null}
      </span>
      <span className="more-card__title">{item.title}</span>
      {item.featured ? <span className="more-card__desc">{item.description}</span> : null}
      <span className="more-card__skills">
        {item.skills.slice(0, item.featured ? 5 : 3).map((skill) => (
          <span key={skill} className="more-card__skill">
            {skill}
          </span>
        ))}
      </span>
      <span className="more-card__go">{work.moreGo} →</span>
    </Link>
  );
}

/**
 * The portfolio under the case files: the featured projects as larger cards,
 * then everything else as a grid. Every card links to the project's own page.
 *
 * The items are rows in `portfolio_items`; nothing here is typed into the
 * component. With nothing published it renders nothing at all, headings
 * included, so an empty table does not leave a title over a gap.
 *
 * Only the first nine of the smaller cards are open. The rest sit inside a
 * <details>, which needs no JavaScript, is in the HTML for search engines, and
 * is opened by find-in-page in current browsers.
 */
function MoreWork({ items }: { items: PortfolioItem[] }) {
  if (!items.length) return null;

  const featured = items.filter((item) => item.featured);
  const rest = items.filter((item) => !item.featured);
  const open = rest.slice(0, MORE_VISIBLE);
  const folded = rest.slice(MORE_VISIBLE);

  return (
    <div className="more-work">
      {featured.length > 0 && (
        <>
          <div className="more-work__head">
            <h3 className="more-work__title">{work.featuredTitle}</h3>
          </div>
          <ul className="more-work__grid more-work__grid--featured" data-stagger>
            {featured.map((item) => (
              <li key={item.slug}>
                <ProjectCard item={item} />
              </li>
            ))}
          </ul>
        </>
      )}

      {rest.length > 0 && (
        <>
          <div className="more-work__head">
            <h3 className="more-work__title">{work.moreTitle}</h3>
            <a className="more-work__all" href={upworkUrl} target="_blank" rel="noopener">
              {work.moreAll}
            </a>
          </div>
          <ul className="more-work__grid" data-stagger>
            {open.map((item, i) => (
              <li key={item.slug}>
                <ProjectCard item={item} index={i} />
              </li>
            ))}
          </ul>

          {folded.length > 0 && (
            <details className="more-work__fold">
              <summary className="btn btn-ghost">
                {work.showAll} ({rest.length})
              </summary>
              <ul className="more-work__grid">
                {folded.map((item, i) => (
                  <li key={item.slug}>
                    <ProjectCard item={item} index={i + MORE_VISIBLE} />
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  );
}

/**
 * A case study beyond the first two, as a compact card. The first two keep the
 * full treatment with the gallery; with five or six all at that size the
 * section would be six screens long before the reader reached anything else.
 */
function CompactCase({ item }: { item: CaseStudy }) {
  return (
    <Link href={`/case-studies/${item.slug}`} className="case-compact">
      <span className="case-compact__code">{item.code}</span>
      <span className="case-compact__title">{item.title}</span>
      <span className="case-compact__body">{item.body}</span>
      {hasMetric(item.metric) ? (
        <span className="case-compact__metric">
          <span className="case-compact__before">{item.metric.before}</span>
          <span aria-hidden="true">→</span>
          <span className="sr-only"> to </span>
          <span className="case-compact__after">{item.metric.after}</span>
          <span className="case-compact__caption">{item.metric.caption}</span>
        </span>
      ) : null}
      <span className="case-compact__tags">
        {item.tags.map((tag) => (
          <span key={tag} className="tag">
            {tag}
          </span>
        ))}
      </span>
      <span className="more-card__go">{work.readMore}</span>
    </Link>
  );
}

export function Work({ cases, more }: { cases: CaseStudy[]; more: PortfolioItem[] }) {
  return (
    <section id="work" className="section section--major section--ink" aria-labelledby="work-title">
      <SectionHeading eyebrow={work.eyebrow} title={work.title} titleId="work-title" />

      <p
        className="section-intro"
        style={{
          fontSize: "var(--text-body)",
          lineHeight: 1.65,
          color: "var(--muted)",
          textWrap: "pretty",
        }}
      >
        {work.intro}
      </p>

      {cases.slice(0, FULL_CASES).map((item) => (
        <article key={item.slug} className="case-card">
          <div className="case-card__bar">
            <span>{item.code}</span>
            <span className="status-pill">
              <span className="status-dot" aria-hidden="true" />
              {item.status}
            </span>
          </div>

          <div className="case-card__body">
            <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: "16px" }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: "var(--text-h3)",
                  lineHeight: 1.15,
                  textWrap: "balance",
                }}
              >
                {item.title}
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: "var(--text-body)",
                  lineHeight: 1.65,
                  color: "var(--muted)",
                  textWrap: "pretty",
                }}
              >
                {item.body}
              </p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {item.tags.map((tag) => (
                  <span key={tag} className="tag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: "18px" }}>
              {/* A case study created with the figures left blank rendered
                  this as two empty values and two zero-width bars. Nothing is
                  better than a comparison with nothing on either side. */}
              {hasMetric(item.metric) ? <BeforeAfter metric={item.metric} /> : null}

              <div className="grid4">
                {item.stats.map((stat) => (
                  <div key={stat.label} className="stat-tile">
                    <span style={{ fontFamily: "var(--font-data)", fontSize: "var(--text-lead)", fontWeight: 700 }}>
                      <CountValue value={stat.value} />
                      {stat.unit && (
                        <span style={{ fontSize: "var(--text-label)", color: "var(--muted)" }}>{stat.unit}</span>
                      )}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-prose)",
                        fontSize: "var(--text-label)",
                        letterSpacing: "0.08em",
                        color: "var(--muted)",
                      }}
                    >
                      {stat.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ padding: "0 clamp(16px, 2vw, 22px) 20px" }}>
            <Screenshot item={item} />
          </div>

          <Link href={`/case-studies/${item.slug}`} className="case-card__more">
            {work.readMore}
          </Link>
        </article>
      ))}

      {/*
        "Every figure above was reconciled…" — so it may only appear when there
        ARE figures above it and every one of them is confirmed. One case study
        still flagged in the console as "my construction rather than fact" is
        enough to make the sentence false, because the sentence says every.
      */}
      {cases.some(hasFigures) && cases.every((item) => canClaimReconciliation(item)) ? (
        <p
          style={{
            margin: 0,
            maxWidth: "72ch",
            fontFamily: "var(--font-prose)",
            fontSize: "var(--text-label)",
            lineHeight: 1.6,
            letterSpacing: "0.04em",
            color: "var(--faint)",
          }}
        >
          {work.metricNote}
        </p>
      ) : null}

      {cases.length > FULL_CASES && (
        <div className="more-work">
          <div className="more-work__head">
            <h3 className="more-work__title">{work.moreCases}</h3>
          </div>
          <ul className="case-compact__grid" data-stagger>
            {cases.slice(FULL_CASES).map((item) => (
              <li key={item.slug}>
                <CompactCase item={item} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <MoreWork items={more} />

      <div className="table-scroll">
        <table className="defect-table">
          <caption>
            {work.tableTitle} · {work.tableSubtitle}
          </caption>
          <thead>
            <tr>
              <th scope="col">AREA</th>
              <th scope="col">DEFECT</th>
              <th scope="col">HOW IT SHOWS UP</th>
              <th scope="col">WHAT IT COSTS</th>
            </tr>
          </thead>
          <tbody>
            {work.defects.map((row) => (
              <tr key={row.defect}>
                <td>{row.area}</td>
                <td>{row.defect}</td>
                <td>{row.symptom}</td>
                <td>{row.cost}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
