import type { Metadata } from "next";
import { AdminState, AdminTable, Ago } from "@/components/admin/Table";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Live events",
  robots: { index: false, follow: false },
};

const LIMIT = 100;

export default async function EventsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .select("id, event_name, event_id, occurred_at, page_path, params, consent, session_id")
    .order("occurred_at", { ascending: false })
    .limit(LIMIT);

  return (
    <>
      <div className="admin-pagehead">
        <h1>Live events</h1>
        <p>
          The {LIMIT} most recent events, newest first. `event_id` is the
          deduplication key — the same string is sent from the browser and from
          the server, so both resolve to one conversion downstream.
        </p>
      </div>

      <section className="admin-card">
        {error ? (
          <AdminState tone="error" title="Could not read events.">
            {error.message}
          </AdminState>
        ) : !data?.length ? (
          <AdminState title="No events recorded yet.">
            The collector writes here as soon as someone visits a public page
            and allows analytics. Nothing is stored for a visitor who declines
            beyond the fact that an event happened.
          </AdminState>
        ) : (
          <AdminTable
            caption="Recent events"
            columns={["When", "Event", "Page", "Consent", "Session", "Event ID"]}
          >
            {data.map((event) => {
              const consent = (event.consent ?? {}) as Record<string, string>;
              const analytics = consent.analytics_storage === "granted";
              return (
                <tr key={event.id}>
                  <td>
                    <Ago iso={event.occurred_at} />
                  </td>
                  <td style={{ color: "var(--ink)" }}>{event.event_name}</td>
                  <td>{event.page_path ?? "—"}</td>
                  <td>
                    <span
                      className="admin-pill"
                      data-tone={analytics ? "success" : "warn"}
                    >
                      {analytics ? "Granted" : "Denied"}
                    </span>
                  </td>
                  <td>
                    {event.session_id ? (
                      <code>{event.session_id.slice(0, 8)}</code>
                    ) : (
                      // Not a gap in the data — consent was denied, so no
                      // identifier was ever created.
                      <span title="No session: analytics storage was denied">—</span>
                    )}
                  </td>
                  <td>
                    <code>{event.event_id.slice(0, 12)}</code>
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
