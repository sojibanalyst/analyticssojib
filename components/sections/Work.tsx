import Link from "next/link";
import { work, type CaseStudy } from "@/content/site";
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

export function Work({ cases }: { cases: CaseStudy[] }) {
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

      {cases.map((item) => (
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
                  fontSize: "var(--text-h4)",
                  fontWeight: 700,
                  letterSpacing: "-0.015em",
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
                    <span style={{ fontFamily: "var(--font-prose)", fontSize: "var(--text-lead)", fontWeight: 800 }}>
                      {stat.value}
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
