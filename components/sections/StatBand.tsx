import { proof, stats, upworkUrl } from "@/content/site";

/**
 * Every figure here is on the public Upwork profile. The attribution line and
 * the link exist so the claims stay checkable — do not add a stat that isn't.
 */
export function StatBand() {
  return (
    <section
      aria-label="Upwork track record"
      style={{
        paddingBlock: "22px 40px",
        paddingInline: "max(clamp(18px, 4vw, 48px), calc((100% - 1280px) / 2))",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      <div
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
                fontFamily: "var(--font-data)",
                fontSize: "clamp(26px, 3vw, 30px)",
                fontWeight: 800,
                letterSpacing: "-0.03em",
              }}
            >
              {stat.value}
              {stat.unit && (
                <span style={{ fontSize: "16px", color: "var(--muted)" }}>
                  {stat.unit}
                </span>
              )}
            </span>
            <span
              style={{
                fontFamily: "var(--font-data)",
                fontSize: "11px",
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
          fontFamily: "var(--font-data)",
          fontSize: "10.5px",
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
