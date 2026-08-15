import type { Metadata } from "next";
import { AdminState, AdminTable, Ago } from "@/components/admin/Table";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Event map",
  robots: { index: false, follow: false },
};

export default async function EventMapPage() {
  const supabase = await createClient();

  const [map, fired] = await Promise.all([
    supabase
      .from("event_map")
      .select("id, event_name, trigger_description, parameters, destinations, dedup_key, status")
      .order("event_name", { ascending: true }),
    // Derived from the events themselves. `event_map.last_fired_at` exists but
    // was never written by anything, so reading it produced a dash on every
    // row that read as "never fired" — see migration 20260814000001.
    supabase.from("event_last_fired").select("event_name, last_fired_at, event_count"),
  ]);

  // A view's columns are all nullable as far as the generated types are
  // concerned, so the nulls are filtered out here rather than asserted away.
  const seen = new Map<string, { lastFired: string | null; count: number }>(
    (fired.data ?? [])
      .filter((row): row is typeof row & { event_name: string } => row.event_name !== null)
      .map((row) => [
        row.event_name,
        { lastFired: row.last_fired_at, count: row.event_count ?? 0 },
      ]),
  );

  const planned = new Set((map.data ?? []).map((row) => row.event_name));
  const undocumented = [...seen.keys()].filter((name) => !planned.has(name)).sort();

  return (
    <>
      <div className="admin-pagehead">
        <h1>Event map</h1>
        <p>
          The documented contract: what each event means, what it carries, and
          where it goes. An event arriving that is not on this list is not a
          feature — it is drift, and it is listed separately below.
        </p>
      </div>

      <section className="admin-card">
        <h2>Documented</h2>
        {map.error ? (
          <AdminState tone="error" title="Could not read the event map.">
            {map.error.message}
          </AdminState>
        ) : fired.error ? (
          <AdminState tone="error" title="Could not read when events last fired.">
            {fired.error.message}
          </AdminState>
        ) : !map.data?.length ? (
          <AdminState title="No events documented yet.">
            Seeded by `npm run seed`. Until then the site is firing events with
            nothing to check them against.
          </AdminState>
        ) : (
          <AdminTable
            caption="Documented events"
            columns={["Event", "Fires when", "Parameters", "Destinations", "State", "Seen", "Last fired"]}
          >
            {map.data.map((row) => {
              const params = Object.keys((row.parameters ?? {}) as Record<string, unknown>);
              const hit = seen.get(row.event_name);
              return (
                <tr key={row.id}>
                  {/* Event name, parameter keys and destination slugs are the
                      strings the code matches on. The trigger description is a
                      sentence someone wrote, so it is not mono. */}
                  <td className="admin-mono" style={{ color: "var(--ink)" }}>
                    {row.event_name}
                  </td>
                  <td>{row.trigger_description ?? "—"}</td>
                  <td className="admin-mono">{params.length ? params.join(", ") : "—"}</td>
                  <td className="admin-mono">
                    {row.destinations.length ? row.destinations.join(", ") : "—"}
                  </td>
                  <td>
                    {/* "Receiving" green, "Documented" neutral. The old pair
                        had it backwards: "Live" — which reads as the healthy
                        state — was rendered in the warning colour, while
                        "Firing" was green. Colour and meaning now agree. */}
                    <span
                      className="admin-pill"
                      data-tone={hit ? "success" : "info"}
                    >
                      {hit ? "Receiving" : "Documented"}
                    </span>
                  </td>
                  <td className="admin-num">{hit ? hit.count.toLocaleString("en-US") : "0"}</td>
                  <td>{hit?.lastFired ? <Ago iso={hit.lastFired} /> : "Never"}</td>
                </tr>
              );
            })}
          </AdminTable>
        )}
      </section>

      <section className="admin-card">
        <h2>Firing but undocumented</h2>
        {undocumented.length === 0 ? (
          <p className="admin-note">
            Nothing. Every event arriving at the collector is on the list above.
          </p>
        ) : (
          <AdminTable caption="Undocumented events" columns={["Event", "Seen", "Action"]}>
            {undocumented.map((name) => (
              <tr key={name}>
                <td className="admin-mono" style={{ color: "var(--ink)" }}>
                  {name}
                </td>
                <td className="admin-num">
                  {(seen.get(name)?.count ?? 0).toLocaleString("en-US")}
                </td>
                <td>
                  <span className="admin-pill" data-tone="warn">
                    Document it or stop firing it
                  </span>
                </td>
              </tr>
            ))}
          </AdminTable>
        )}
      </section>
    </>
  );
}
