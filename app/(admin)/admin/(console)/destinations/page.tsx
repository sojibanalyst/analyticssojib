import type { Metadata } from "next";
import { AdminState, AdminTable, Ago } from "@/components/admin/Table";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Destinations",
  robots: { index: false, follow: false },
};

export default async function DestinationsPage() {
  const supabase = await createClient();

  const [destinations, deliveries] = await Promise.all([
    supabase
      .from("destinations")
      .select("id, key, label, enabled, config, last_ok_at, last_error_at, last_error")
      .order("key", { ascending: true }),
    supabase.from("event_deliveries").select("destination, status").limit(1000),
  ]);

  // Counted per destination so a destination that is enabled but silent is
  // visibly different from one that is enabled and working.
  const tally = new Map<string, Record<string, number>>();
  for (const row of deliveries.data ?? []) {
    const bucket = tally.get(row.destination) ?? {};
    bucket[row.status] = (bucket[row.status] ?? 0) + 1;
    tally.set(row.destination, bucket);
  }

  return (
    <>
      <div className="admin-pagehead">
        <h1>Destinations</h1>
        <p>
          Where server-side events are forwarded. Every one starts disabled and
          empty. Access tokens and API secrets are never stored here — they live
          in environment variables; this table holds only ids that would be
          harmless in a screenshot.
        </p>
      </div>

      <section className="admin-card">
        {destinations.error ? (
          <AdminState tone="error" title="Could not read destinations.">
            {destinations.error.message}
          </AdminState>
        ) : !destinations.data?.length ? (
          <AdminState title="No destinations configured.">
            Run `npm run seed` to create the five the brief names, all disabled.
          </AdminState>
        ) : (
          <AdminTable
            caption="Configured destinations"
            columns={["Destination", "State", "Sent", "Skipped", "Failed", "Last result"]}
          >
            {destinations.data.map((destination) => {
              const counts = tally.get(destination.key) ?? {};
              const configured = Object.keys(
                (destination.config ?? {}) as Record<string, unknown>,
              ).length;

              return (
                <tr key={destination.id}>
                  <td style={{ color: "var(--ink)" }}>
                    {destination.label}
                    <div style={{ color: "var(--ink-muted)" }}>{destination.key}</div>
                  </td>
                  <td>
                    <span
                      className="admin-pill"
                      data-tone={
                        destination.enabled ? "success" : configured ? "warn" : "info"
                      }
                    >
                      {destination.enabled
                        ? "Enabled"
                        : configured
                          ? "Configured, off"
                          : "Not set up"}
                    </span>
                  </td>
                  <td>{counts.sent ?? 0}</td>
                  <td>{counts.skipped ?? 0}</td>
                  <td>{counts.failed ?? 0}</td>
                  <td>
                    {destination.last_error ? (
                      <>
                        <span className="admin-pill" data-tone="danger">
                          Error
                        </span>
                        <div>{destination.last_error}</div>
                        {destination.last_error_at ? (
                          <Ago iso={destination.last_error_at} />
                        ) : null}
                      </>
                    ) : destination.last_ok_at ? (
                      <Ago iso={destination.last_ok_at} />
                    ) : (
                      "Never sent"
                    )}
                  </td>
                </tr>
              );
            })}
          </AdminTable>
        )}
      </section>

      <section className="admin-card">
        <h2>Not wired yet</h2>
        <p className="admin-note">
          Forwarding itself — the worker that reads `event_deliveries` and calls
          each API — is not built. These rows are configuration only. Nothing is
          being sent anywhere, and this screen says so rather than showing zeros
          that could be mistaken for &ldquo;sent nothing today&rdquo;.
        </p>
      </section>
    </>
  );
}
