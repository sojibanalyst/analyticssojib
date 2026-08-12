import type { Metadata } from "next";
import { navGroups } from "../nav";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

/**
 * A count, or the reason there isn't one.
 *
 * Distinguishing "0" from "the query failed" matters more here than anywhere
 * else on the site: this console exists to tell the owner whether tracking is
 * working, and a failed query rendered as a confident 0 would be the exact
 * failure it is meant to catch.
 */
type Metric =
  | { label: string; value: number; note: string }
  | { label: string; error: string; note: string };

/** head + exact = the count only, no rows over the wire. */
type CountResult = { count: number | null; error: { message: string } | null };

function toMetric(label: string, note: string, result: CountResult): Metric {
  if (result.error) return { label, error: result.error.message, note };
  return { label, value: result.count ?? 0, note };
}

/** Outside the component: reading the clock during render is not pure. */
function twentyFourHoursAgo(): string {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const since = twentyFourHoursAgo();
  const head = { count: "exact", head: true } as const;

  const [leads, newLeads, events, sessions] = await Promise.all([
    supabase.from("leads").select("*", head),
    supabase.from("leads").select("*", head).eq("status", "new"),
    supabase.from("events").select("*", head).gte("occurred_at", since),
    supabase.from("sessions").select("*", head).gte("last_seen_at", since),
  ]);

  const metrics: Metric[] = [
    toMetric("Leads", "All time", leads),
    toMetric("New leads", "Awaiting a reply", newLeads),
    toMetric("Events", "Last 24 hours", events),
    toMetric("Sessions", "Last 24 hours", sessions),
  ];

  const stubs = navGroups.flatMap((group) =>
    group.items.filter((item) => !item.ready).map((item) => ({ ...item, group: group.title })),
  );

  return (
    <>
      <div className="admin-pagehead">
        <h1>Dashboard</h1>
        <p>
          Schema, auth and RLS are live. Nothing writes to these tables yet — the
          collector arrives in P3, so every number below is genuinely zero rather
          than missing.
        </p>
      </div>

      <div className="admin-grid">
        {metrics.map((metric) => (
          <div className="admin-card" key={metric.label}>
            <p className="admin-metric-label">{metric.label}</p>
            {"error" in metric ? (
              <>
                <p className="admin-pill" data-tone="danger">
                  Query failed
                </p>
                <p className="admin-note" data-tone="danger">
                  {metric.error}
                </p>
              </>
            ) : (
              <p className="admin-metric-value">{metric.value.toLocaleString("en-US")}</p>
            )}
            <p className="admin-note">{metric.note}</p>
          </div>
        ))}
      </div>

      <section className="admin-card">
        <h2>Not built yet</h2>
        <div className="admin-tablewrap">
          <table className="admin-table">
            <caption className="sr-only">
              Console screens that later phases deliver
            </caption>
            <thead>
              <tr>
                <th scope="col">Screen</th>
                <th scope="col">Section</th>
                <th scope="col">Phase</th>
              </tr>
            </thead>
            <tbody>
              {stubs.map((stub) => (
                <tr key={stub.href}>
                  <td>{stub.label}</td>
                  <td>{stub.group}</td>
                  <td>
                    <span className="admin-pill" data-tone="warn">
                      {stub.phase}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
