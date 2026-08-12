import Link from "next/link";
import { work, type CaseStudy } from "@/content/site";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CaseGallery } from "@/components/sections/CaseGallery";

function BeforeAfter({ metric }: { metric: CaseStudy["metric"] }) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "14px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              letterSpacing: "0.1em",
              color: "var(--muted)",
            }}
          >
            {metric.beforeLabel}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(28px, 3.4vw, 34px)",
              fontWeight: 500,
              color: "var(--faint)",
              letterSpacing: "-0.03em",
            }}
          >
            {metric.before}
          </span>
        </div>

        <div style={{ flex: "1 1 110px", display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ height: "9px", background: "var(--border)", position: "relative" }}>
            <div
              style={{
                position: "absolute",
                inset: `0 ${100 - metric.beforePct}% 0 0`,
                background: "var(--faint)",
              }}
            />
          </div>
          <div style={{ height: "9px", background: "var(--border)", position: "relative" }}>
            <div
              style={{
                position: "absolute",
                inset: `0 ${100 - metric.afterPct}% 0 0`,
                background: "var(--accent)",
              }}
            />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              letterSpacing: "0.1em",
              color: "var(--ink)",
            }}
          >
            {metric.afterLabel}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(28px, 3.4vw, 34px)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
            }}
          >
            {metric.after}
          </span>
        </div>
      </div>

      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          letterSpacing: "0.08em",
          color: "var(--muted)",
        }}
      >
        {metric.caption}
      </span>
    </>
  );
}

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
    <section id="work" className="section" aria-labelledby="work-title">
      <SectionHeading eyebrow={work.eyebrow} title={work.title} titleId="work-title" />

      <p
        style={{
          margin: 0,
          maxWidth: "62ch",
          fontSize: "15px",
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
                  fontSize: "clamp(21px, 2.4vw, 24px)",
                  fontWeight: 700,
                  letterSpacing: "-0.015em",
                }}
              >
                {item.title}
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: "15px",
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
              <BeforeAfter metric={item.metric} />

              <div className="grid4">
                {item.stats.map((stat) => (
                  <div key={stat.label} className="stat-tile">
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "20px", fontWeight: 800 }}>
                      {stat.value}
                      {stat.unit && (
                        <span style={{ fontSize: "12px", color: "var(--muted)" }}>{stat.unit}</span>
                      )}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "11px",
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

      <p
        style={{
          margin: 0,
          maxWidth: "72ch",
          fontFamily: "var(--font-mono)",
          fontSize: "11.5px",
          lineHeight: 1.6,
          letterSpacing: "0.04em",
          color: "var(--faint)",
        }}
      >
        {work.metricNote}
      </p>

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
