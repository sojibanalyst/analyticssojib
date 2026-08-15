import type { Metadata } from "next";
import { AdminState, AdminTable, Ago } from "@/components/admin/Table";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { SavingForm } from "@/components/admin/SavingForm";
import { SecretField } from "@/components/admin/SecretField";
import { createClient } from "@/lib/supabase/server";
import { DESTINATION_SPECS } from "@/lib/destinations";
import { getDestinationSecret } from "@/lib/secrets";
import { clearDestinationSecret, saveDestination } from "./actions";

export const metadata: Metadata = {
  title: "Destinations",
  robots: { index: false, follow: false },
};

export default async function DestinationsPage() {
  const supabase = await createClient();

  const [destinations, deliveries] = await Promise.all([
    supabase
      .from("destinations")
      .select(
        "id, key, label, enabled, config, last_ok_at, last_error_at, last_error, secret_last4, secret_updated_at",
      )
      .order("key", { ascending: true }),
    supabase.from("event_deliveries").select("destination, status").limit(1000),
  ]);

  // Which credential the worker would actually use, per destination. This
  // resolves the value server-side and keeps it here — only the source label
  // reaches the page.
  const sources = new Map<string, "database" | "env" | "none">();
  for (const row of destinations.data ?? []) {
    if (!DESTINATION_SPECS[row.key]?.secret) continue;
    const { source } = await getDestinationSecret(row.key);
    sources.set(row.key, source);
  }

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
          Where server-side events are forwarded. Identifiers like a
          measurement ID are ordinary settings — they appear in the page source
          of any site running the tag, so hiding them here would be theatre.
          Credentials are different: they are encrypted into Supabase Vault,
          which holds its key outside the database, and this screen can never
          read one back. It shows you the last four characters so you can tell
          which one is loaded, and nothing more.
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
            caption="Delivery counts per destination"
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
                      data-tone={destination.enabled ? "success" : configured ? "warn" : "info"}
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
                        {/* Safe to render: credentials are stripped before this
                            column is written, by lib/secrets and again by a
                            database trigger. */}
                        <div>{destination.last_error}</div>
                        {destination.last_error_at ? <Ago iso={destination.last_error_at} /> : null}
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

      {(destinations.data ?? []).map((destination) => {
        const spec = DESTINATION_SPECS[destination.key];
        if (!spec) return null;

        const config = (destination.config ?? {}) as Record<string, string>;
        const source = sources.get(destination.key) ?? "none";

        return (
          <section className="admin-card" key={`cfg-${destination.id}`}>
            <h2>{spec.label}</h2>

            <SavingForm action={saveDestination}>
              <input type="hidden" name="key" value={destination.key} />

              {spec.public ? (
                <div className="admin-field">
                  <label htmlFor={`${destination.key}-public`}>{spec.public.label}</label>
                  <input
                    id={`${destination.key}-public`}
                    name={spec.public.key}
                    defaultValue={config[spec.public.key] ?? ""}
                    placeholder={spec.public.placeholder}
                    pattern={spec.public.pattern}
                    spellCheck={false}
                  />
                  <p className="admin-note">{spec.public.help}</p>
                </div>
              ) : null}

              {spec.secret ? (
                <SecretField
                  name="secret"
                  label={spec.secret.label}
                  help={spec.secret.help}
                  last4={destination.secret_last4}
                  updatedAt={destination.secret_updated_at}
                  source={source}
                  envVar={spec.secret.envVar}
                />
              ) : null}

              <label className="admin-check">
                <input type="checkbox" name="enabled" defaultChecked={destination.enabled} />
                Forward events to this destination
              </label>
            </SavingForm>

            {spec.secret && source === "database" ? (
              <DeleteButton
                action={clearDestinationSecret}
                id={destination.key}
                label="Remove credential"
              />
            ) : null}
          </section>
        );
      })}

      <section className="admin-card">
        <h2>Not wired yet</h2>
        <p className="admin-note">
          Forwarding itself — the worker that reads `event_deliveries` and calls
          each API — is not built. These settings are stored and ready; nothing
          is being sent anywhere, and the table above says so rather than
          showing zeros that could be mistaken for &ldquo;sent nothing
          today&rdquo;.
        </p>
      </section>
    </>
  );
}
