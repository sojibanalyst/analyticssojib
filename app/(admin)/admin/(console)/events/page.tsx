import type { Metadata } from "next";
import { AdminState, AdminTable, Ago } from "@/components/admin/Table";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Live events",
  robots: { index: false, follow: false },
};

const LIMIT = 100;

/**
 * The events the site actually fires, matching the seeded event map. Listed
 * rather than derived from the data so a filter chip does not vanish the
 * moment an event stops arriving — which is exactly when you want to click it.
 */
const EVENT_NAMES = [
  "page_view",
  "generate_lead",
  "book_call_click",
  "consent_update",
] as const;

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>;
}) {
  const { event } = await searchParams;
  // Narrowed against the known list: an unknown ?event= becomes "no filter"
  // rather than a query that returns nothing and looks like an outage.
  const filtering = EVENT_NAMES.find((name) => name === event) ?? null;

  const supabase = await createClient();

  let query = supabase
    .from("events")
    .select("id, event_name, event_id, occurred_at, page_path, params, consent, session_id")
    .order("occurred_at", { ascending: false })
    .limit(LIMIT);

  if (filtering) query = query.eq("event_name", filtering);

  const [{ data, error }, total] = await Promise.all([
    query,
    supabase.from("events").select("*", { count: "exact", head: true }),
  ]);

  const anyEvents = (total.count ?? 0) > 0;

  return (
    <>
      <div className="admin-pagehead">
        <h1>Live events</h1>
        <p>
          The {LIMIT} most recent {filtering ? `${filtering} ` : ""}events,
          newest first. `event_id` is the deduplication key — the same string
          is sent from the browser and from the server, so both resolve to one
          conversion downstream. Hover a timestamp for the exact time.
        </p>
      </div>

      <nav className="admin-filters" aria-label="Filter by event">
        <a
          href="/admin/events"
          className="admin-navlink"
          data-compact="true"
          aria-current={!filtering ? "page" : undefined}
        >
          All
        </a>
        {EVENT_NAMES.map((name) => (
          <a
            key={name}
            href={`/admin/events?event=${name}`}
            className="admin-navlink"
            data-compact="true"
            aria-current={filtering === name ? "page" : undefined}
          >
            {name}
          </a>
        ))}
      </nav>

      <section className="admin-card">
        {error ? (
          <AdminState tone="error" title="Could not read events.">
            {error.message}
          </AdminState>
        ) : !data?.length ? (
          anyEvents ? (
            <AdminState tone="filtered" title={`No ${filtering} events recorded.`}>
              Other events have arrived — clear the filter to see them.
            </AdminState>
          ) : (
            <AdminState title="No events recorded yet.">
              The collector writes here as soon as someone visits a public page
              and allows analytics. Nothing is stored for a visitor who declines
              beyond the fact that an event happened.
            </AdminState>
          )
        ) : (
          <AdminTable
            caption="Recent events"
            columns={["When", "Event", "Page", "Consent", "Session", "Event ID"]}
          >
            {data.map((row) => {
              const consent = (row.consent ?? {}) as Record<string, string>;
              const analytics = consent.analytics_storage === "granted";
              return (
                <tr key={row.id}>
                  <td>
                    <Ago iso={row.occurred_at} />
                  </td>
                  <td style={{ color: "var(--ink)" }}>{row.event_name}</td>
                  <td>{row.page_path ?? "—"}</td>
                  <td>
                    <span className="admin-pill" data-tone={analytics ? "success" : "warn"}>
                      {analytics ? "Granted" : "Denied"}
                    </span>
                  </td>
                  <td>
                    {row.session_id ? (
                      <code>{row.session_id.slice(0, 8)}</code>
                    ) : (
                      // Not a gap in the data — consent was denied, so no
                      // identifier was ever created.
                      <span title="No session: analytics storage was denied">—</span>
                    )}
                  </td>
                  <td>
                    <code>{row.event_id.slice(0, 12)}</code>
                  </td>
                </tr>
              );
            })}
          </AdminTable>
        )}
      </section>
    </>
  );
}
