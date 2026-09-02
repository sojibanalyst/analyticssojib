import { type CaseStudy } from "@/content/site";

/**
 * The before/after comparison: two values, two bars, one caption.
 *
 * Lifted out of Work.tsx because it was rendering on the homepage CARD only.
 * The full case-study page — the one a search result or a shared link lands on
 * — showed the prose and the screenshots but not the headline figure the whole
 * case is built around. Same component now serves both, so they cannot drift.
 */
export function BeforeAfter({ metric }: { metric: CaseStudy["metric"] }) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "14px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span
            style={{
              fontFamily: "var(--font-prose)",
              fontSize: "var(--text-label)",
              letterSpacing: "0.1em",
              color: "var(--muted)",
            }}
          >
            {metric.beforeLabel}
          </span>
          <span
            style={{
              fontFamily: "var(--font-prose)",
              fontSize: "var(--text-h2)",
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
              fontFamily: "var(--font-prose)",
              fontSize: "var(--text-label)",
              letterSpacing: "0.1em",
              color: "var(--ink)",
            }}
          >
            {metric.afterLabel}
          </span>
          <span
            style={{
              fontFamily: "var(--font-prose)",
              fontSize: "var(--text-h2)",
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
          fontFamily: "var(--font-prose)",
          fontSize: "var(--text-label)",
          letterSpacing: "0.08em",
          color: "var(--muted)",
        }}
      >
        {metric.caption}
      </span>
    </>
  );
}
