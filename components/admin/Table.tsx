import type { ReactNode } from "react";

/**
 * The four table states the design specifies. All four are real: a screen that
 * only handles "has rows" is the reason dashboards lie.
 *
 *   data      — rows
 *   empty     — nothing has ever been recorded
 *   filtered  — rows exist, but none match the current filter
 *   error     — the query failed, which is NOT the same as empty
 */
export function AdminState({
  tone = "empty",
  title,
  children,
}: {
  tone?: "empty" | "filtered" | "error";
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="admin-state" role={tone === "error" ? "alert" : undefined}>
      <span className="admin-pill" data-tone={tone === "error" ? "danger" : "info"}>
        {tone === "error" ? "Query failed" : tone === "filtered" ? "No matches" : "Empty"}
      </span>
      <p style={{ margin: 0, color: "var(--ink)" }}>{title}</p>
      {children ? <p style={{ margin: 0 }}>{children}</p> : null}
    </div>
  );
}

export function AdminTable({
  caption,
  columns,
  children,
}: {
  caption: string;
  columns: string[];
  children: ReactNode;
}) {
  return (
    <div className="admin-tablewrap">
      <table className="admin-table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/**
 * Absolute time in a title, relative time on screen.
 *
 * The console is read at a glance — "4m ago" answers "is the collector alive?"
 * faster than a timestamp does — but the exact value has to stay reachable,
 * because "4m ago" is useless when reconciling against another system.
 */
/** Outside the component: reading the clock during render is not pure. */
function secondsSince(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
}

/**
 * The absolute time behind the relative one.
 *
 * Formatted in UTC and labelled as such, rather than with toLocaleString().
 * These are server components: an unqualified locale string would render in
 * the SERVER's timezone while looking like the reader's, which is worse than
 * no timestamp when you are reconciling against another system. UTC is at
 * least unambiguous, and it matches what the database holds.
 */
function absolute(iso: string): string {
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return iso;
  return (
    when.toLocaleString("en-GB", {
      dateStyle: "medium",
      timeStyle: "medium",
      timeZone: "UTC",
    }) + " UTC"
  );
}

export function Ago({ iso }: { iso: string }) {
  const seconds = secondsSince(iso);

  const label =
    seconds < 60
      ? `${seconds}s ago`
      : seconds < 3600
        ? `${Math.round(seconds / 60)}m ago`
        : seconds < 86400
          ? `${Math.round(seconds / 3600)}h ago`
          : `${Math.round(seconds / 86400)}d ago`;

  return (
    <time dateTime={iso} title={absolute(iso)}>
      {label}
    </time>
  );
}
