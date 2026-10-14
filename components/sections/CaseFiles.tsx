import Link from "next/link";
import { work, type CaseStudy } from "@/content/site";
import { CountValue } from "@/components/CountValue";
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

/**
 * A case study as a compact card: what the homepage teaser shows. The full
 * treatment, with the gallery, is CaseFile on /case-studies.
 */
export function CompactCase({ item }: { item: CaseStudy }) {
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

/** A case study at full size: the figures, the stats, the gallery. */
export function CaseFile({ item }: { item: CaseStudy }) {
  return (
    <article className="case-card">
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
  );
}

/**
 * "Every figure above was reconciled…", so it may only appear when there ARE
 * figures above it and every one of them is confirmed. One case study still
 * flagged in the console as "my construction rather than fact" is enough to
 * make the sentence false, because the sentence says every.
 */
export function MetricNote({ cases }: { cases: CaseStudy[] }) {
  if (!cases.some(hasFigures) || !cases.every((item) => canClaimReconciliation(item))) return null;
  return (
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
  );
}

/** The defects that come up again and again, as a table. */
export function DefectTable() {
  return (
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
  );
}
