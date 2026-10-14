import type { ReactNode } from "react";

type Props = {
  /** The figure. A node rather than a string so a count-up can be passed in. */
  value: ReactNode;
  /** Small unit set after the value: "pts", "/10", "%". */
  unit?: string;
  label: string;
  /** `good` turns the figure green, `bad` red. Neutral by default. */
  tone?: "neutral" | "good" | "bad";
  className?: string;
};

/**
 * One figure and what it measures.
 *
 * The value is mono because it is data; the label is the mono uppercase tag
 * used across the site. Rendered as a term and its description, because that
 * is what a stat is, and it is what lets a screen reader pair the two.
 *
 * Wrap a group of these in a <dl>.
 */
export function StatCard({ value, unit, label, tone = "neutral", className }: Props) {
  return (
    <div className={["stat-card", className].filter(Boolean).join(" ")} data-tone={tone}>
      <dt className="stat-card__label">{label}</dt>
      <dd className="stat-card__value">
        {value}
        {unit ? <span className="stat-card__unit">{unit}</span> : null}
      </dd>
    </div>
  );
}
