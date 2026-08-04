import { work } from "@/content/site";
import { SectionHeading } from "@/components/ui/SectionHeading";

/**
 * Capability cards, not case studies. The design shipped two fabricated client
 * case files with before/after figures; no real ones were supplied, so this
 * keeps the design's card shell and tag row but describes the failure modes
 * and what fixing them yields — no client names, no invented numbers.
 * See DESIGN-NOTES.md §3B.
 */
export function Work() {
  return (
    <section id="work" className="section" aria-labelledby="work-title">
      <SectionHeading
        eyebrow={work.eyebrow}
        title={work.title}
        titleId="work-title"
      />

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

      {work.items.map((item) => (
        <article key={item.code} className="case-card">
          <div className="case-card__bar">
            <span>{item.code}</span>
            <span className="status-pill">
              <span className="status-dot" aria-hidden="true" />
              {item.status}
            </span>
          </div>

          <div className="case-card__body">
            <div
              style={{
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
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

            <div
              style={{
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                gap: "18px",
              }}
            >
              {item.metric && (
                <>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "14px",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "11px",
                          letterSpacing: "0.1em",
                          color: "var(--muted)",
                        }}
                      >
                        BEFORE
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
                        {item.metric.before}
                      </span>
                    </div>

                    <div
                      style={{
                        flex: "1 1 110px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                      }}
                    >
                      <div style={{ height: "9px", background: "var(--border)", position: "relative" }}>
                        <div
                          style={{
                            position: "absolute",
                            inset: `0 ${100 - item.metric.beforePct}% 0 0`,
                            background: "var(--faint)",
                          }}
                        />
                      </div>
                      <div style={{ height: "9px", background: "var(--border)", position: "relative" }}>
                        <div
                          style={{
                            position: "absolute",
                            inset: `0 ${100 - item.metric.afterPct}% 0 0`,
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
                        AFTER
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "clamp(28px, 3.4vw, 34px)",
                          fontWeight: 800,
                          letterSpacing: "-0.03em",
                        }}
                      >
                        {item.metric.after}
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
                    {item.metric.caption}
                  </span>
                </>
              )}

              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  letterSpacing: "0.08em",
                  color: "var(--muted)",
                }}
              >
                WHAT YOU END UP WITH
              </span>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                  gap: "12px",
                }}
              >
                {item.outcomes.map((outcome) => (
                  <span key={outcome} className="tile">
                    {outcome}
                  </span>
                ))}
              </div>
            </div>
          </div>
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
