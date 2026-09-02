import { StatValue } from "@/components/StatValue";
import { proof, stats, upworkUrl } from "@/content/site";

/**
 * Every figure here is on the public Upwork profile. The attribution line and
 * the link exist so the claims stay checkable — do not add a stat that isn't.
 */
export function StatBand() {
  return (
    <section
      aria-label="Upwork track record"
      className="section section--evidence section--sunk"
      style={{ gap: "12px" }}
    >
      <div
        data-stagger
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(148px, 1fr))",
          gap: "12px",
        }}
      >
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="card"
            style={{ padding: "18px 20px", gap: "6px" }}
          >
            <span
              style={{
                fontFamily: "var(--font-prose)",
                fontSize: "var(--text-h3)",
                fontWeight: 800,
                letterSpacing: "-0.03em",
              }}
            >
              <StatValue value={stat.value} />
              {stat.unit && (
                <span style={{ fontSize: "var(--text-body)", color: "var(--muted)" }}>
                  {stat.unit}
                </span>
              )}
            </span>
            <span
              style={{
                fontFamily: "var(--font-prose)",
                fontSize: "var(--text-label)",
                letterSpacing: "0.1em",
                color: "var(--muted)",
              }}
            >
              {stat.label}
            </span>
          </div>
        ))}
      </div>

      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-prose)",
          fontSize: "var(--text-label)",
          letterSpacing: "0.1em",
          color: "var(--faint)",
        }}
      >
        {proof.badge} ·{" "}
        <a href={upworkUrl} target="_blank" rel="noopener">
          {proof.attribution}
        </a>
      </p>
    </section>
  );
}
