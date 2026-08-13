import type { Metadata } from "next";
import { AdminState, AdminTable, Ago } from "@/components/admin/Table";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Event map",
  robots: { index: false, follow: false },
};

export default async function EventMapPage() {
  const supabase = await createClient();

  const [map, seen] = await Promise.all([
    supabase
      .from("event_map")
      .select("id, event_name, trigger_description, parameters, destinations, dedup_key, status, last_fired_at")
      .order("event_name", { ascending: true }),
    // What has actually arrived, as opposed to what was planned. The gap
    // between the two lists is the only interesting thing on this screen.
    supabase.from("events").select("event_name").limit(1000),
  ]);

  const observed = new Set((seen.data ?? []).map((row) => row.event_name));
  const planned = new Set((map.data ?? []).map((row) => row.event_name));
  const undocumented = [...observed].filter((name) => !planned.has(name)).sort();

  return (
    <>
      <div className="admin-pagehead">
        <h1>Event map</h1>
        <p>
          The documented contract: what each event means, what it carries, and
          where it goes. An event firing that is not on this list is not a
          feature — it is drift, and it is listed separately below.
        </p>
      </div>

      <section className="admin-card">
        <h2>Documented</h2>
        {map.error ? (
          <AdminState tone="error" title="Could not read the event map.">
            {map.error.message}
          </AdminState>
        ) : !map.data?.length ? (
          <AdminState title="No events documented yet.">
            Seeded by `npm run seed`. Until then the site is firing events with
            nothing to check them against.
          </AdminState>
        ) : (
          <AdminTable
            caption="Documented events"
            columns={["Event", "Fires when", "Parameters", "Destinations", "Status", "Last fired"]}
          >
            {map.data.map((row) => {
              const params = Object.keys((row.parameters ?? {}) as Record<string, unknown>);
              const live = observed.has(row.event_name);
              return (
                <tr key={row.id}>
                  <td style={{ color: "var(--ink)" }}>{row.event_name}</td>
                  <td>{row.trigger_description ?? "—"}</td>
                  <td>{params.length ? params.join(", ") : "—"}</td>
                  <td>{row.destinations.length ? row.destinations.join(", ") : "—"}</td>
                  <td>
                    <span
                      className="admin-pill"
                      data-tone={live ? "success" : row.status === "planned" ? "info" : "warn"}
                    >
                      {live ? "Firing" : row.status}
                    </span>
                  </td>
                  <td>{row.last_fired_at ? <Ago iso={row.last_fired_at} /> : "—"}</td>
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
          <AdminTable caption="Undocumented events" columns={["Event", "Action"]}>
            {undocumented.map((name) => (
              <tr key={name}>
                <td style={{ color: "var(--ink)" }}>{name}</td>
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
