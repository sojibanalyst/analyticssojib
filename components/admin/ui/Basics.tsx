import Link from "next/link";

/**
 * The small shared pieces of the console: status badge, switch, empty state,
 * skeleton and page header. Server-safe (no hooks), so any screen can use
 * them; the Switch is a plain controlled button and takes its handler from a
 * client parent.
 */

export type Status = "published" | "draft" | "hidden" | "needs-check";

const STATUS_LABEL: Record<Status, string> = {
  published: "Published",
  draft: "Draft",
  hidden: "Hidden",
  "needs-check": "Needs check",
};

/** Published / Draft / Hidden / Needs check. Text and a dot, never colour alone. */
export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className="ax-badge" data-status={status}>
      <span className="ax-badge__dot" aria-hidden="true" />
      {STATUS_LABEL[status]}
    </span>
  );
}

/** An on/off switch. role="switch" with aria-checked, labelled by its text. */
export function Switch({
  checked,
  onChange,
  label,
  hideLabel = false,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  /** Keep the label for screen readers only, as in a table row. */
  hideLabel?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className="ax-switch"
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span className="ax-switch__track" aria-hidden="true">
        <span className="ax-switch__thumb" />
      </span>
      <span className={hideLabel ? "sr-only" : "ax-switch__label"}>{label}</span>
    </button>
  );
}

/** What to do when a list is empty: one line, and the action that fills it. */
export function EmptyState({
  title,
  action,
}: {
  title: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="ax-empty">
      <p className="ax-empty__title">{title}</p>
      {action ? (
        <Link href={action.href} className="ax-btn" data-variant="primary">
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

/** Grey bars where content will be. Stands still under reduced motion. */
export function Skeleton({ rows = 6, label = "Loading" }: { rows?: number; label?: string }) {
  return (
    <div className="ax-skeleton" role="status" aria-label={label}>
      {Array.from({ length: rows }, (_, i) => (
        <span key={i} className="ax-skeleton__bar" style={{ width: `${92 - ((i * 17) % 40)}%` }} />
      ))}
    </div>
  );
}

/**
 * The head of every console screen: the title, a one-line subtitle, and the
 * screen's actions on the right (its primary "New ..." button, "View on site").
 * Longer explanations go behind a "?" with `help`, not under the title.
 */
export function PageHeader({
  title,
  subtitle,
  help,
  actions,
}: {
  title: string;
  subtitle?: string;
  help?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="ax-pagehead">
      <div className="ax-pagehead__text">
        <h1 className="ax-pagehead__title">
          {title}
          {help ? <HelpTip text={help} /> : null}
        </h1>
        {subtitle ? <p className="ax-pagehead__sub">{subtitle}</p> : null}
      </div>
      {actions ? <div className="ax-pagehead__actions">{actions}</div> : null}
    </div>
  );
}

/**
 * A small "?" that shows a longer note on hover or focus. The note is also its
 * accessible description, so it is read out without hovering.
 */
export function HelpTip({ text }: { text: string }) {
  return (
    <span className="ax-help">
      <button type="button" className="ax-help__btn" aria-label={`Help: ${text}`}>
        ?
      </button>
      <span className="ax-help__tip" role="tooltip" aria-hidden="true">
        {text}
      </span>
    </span>
  );
}
