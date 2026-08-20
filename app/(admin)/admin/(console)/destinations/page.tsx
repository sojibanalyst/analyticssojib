import type { Metadata } from "next";
import { AdminState, AdminTable, Ago } from "@/components/admin/Table";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { SavingForm } from "@/components/admin/SavingForm";
import { SecretField } from "@/components/admin/SecretField";
import { createClient } from "@/lib/supabase/server";
import { DESTINATION_SPECS } from "@/lib/destinations";
import { destinationState, missingFor, STATE_LABEL, STATE_TONE } from "@/lib/destination-state";
import { clearDestinationSecret, saveDestination, testDestination } from "./actions";

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
        "id, key, label, enabled, config, last_ok_at, last_error_at, last_error, secret_last4, secret_updated_at, secret_vault_id, last_test_at, last_test_ok, last_test_message, last_test_conclusive",
      )
      .order("key", { ascending: true }),
    supabase.from("event_deliveries").select("destination, status").limit(1000),
  ]);

  /**
   * Where the credential would come from — without decrypting anything.
   *
   * The console never needs the value, only whether one exists, so this reads
   * the vault POINTER on the row and the presence of the env var. Decrypting
   * to render a status pill would put plaintext secrets into page rendering
   * for no benefit, and would be the one place they could end up cached.
   *
   * Only the fan-out worker and the Test button decrypt, at the moment of use.
   */
  const sources = new Map<string, "database" | "env" | "none">();
  for (const row of destinations.data ?? []) {
    const spec = DESTINATION_SPECS[row.key];
    if (!spec?.secret) continue;

    if (row.secret_vault_id) sources.set(row.key, "database");
    else if (process.env[spec.secret.envVar]) sources.set(row.key, "env");
    else sources.set(row.key, "none");
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
              const inputs = {
                key: destination.key,
                enabled: destination.enabled,
                config: (destination.config ?? {}) as Record<string, unknown>,
                hasSecret: sources.get(destination.key) !== "none",
              };
              const state = destinationState(inputs);
              const missing = missingFor(inputs);

              return (
                <tr key={destination.id}>
                  <td style={{ color: "var(--ink)" }}>
                    {/* The label is a name a person wrote — "Meta Conversions
                        API" — and stays sans. The key underneath is the slug
                        the code matches on, so it does not. */}
                    {destination.label}
                    <div className="admin-mono" style={{ color: "var(--ink-muted)" }}>
                      {destination.key}
                    </div>
                  </td>
                  <td>
                    {/* Derived, never stored — same principle as the reviews
                        page's placeholder flag. A status column would be one
                        forgotten update away from claiming LIVE about a
                        destination with no credentials. */}
                    <span className="admin-pill" data-tone={STATE_TONE[state]}>
                      {STATE_LABEL[state]}
                    </span>
                    {missing.length ? (
                      <div className="admin-reason">needs {missing.join(" + ")}</div>
                    ) : null}
                  </td>
                  <td className="admin-num">{counts.sent ?? 0}</td>
                  <td className="admin-num">{counts.skipped ?? 0}</td>
                  <td className="admin-num">{counts.failed ?? 0}</td>
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
                  {/* Every public field in a destination spec is an
                      identifier — G-XXXXXXX, a pixel id, a customer id, a
                      container URL — so the input holding it stays mono. */}
                  <input
                    id={`${destination.key}-public`}
                    className="admin-mono"
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

            {/* The result of a real request, not an inference from the
                presence of credentials. A card that has never been tested says
                so — implying health it has not demonstrated is how a wrong
                token survives three weeks of silently failed conversions. */}
            <div className="admin-testrow">
              <SavingForm
                action={testDestination}
                className="admin-inline-form"
                submitLabel="Test connection"
                pendingLabel="Testing…"
                variant="ghost"
              >
                <input type="hidden" name="key" value={destination.key} />
              </SavingForm>

              {destination.last_test_at ? (
                <p className="admin-note">
                  {/* Three outcomes, not two. "Inconclusive" is green-adjacent
                      nowhere: GA4 answers 2xx for a wrong api_secret, so an
                      accepted payload has proved the payload and nothing more,
                      and saying "Passed" there would be the exact false
                      assurance this button exists to remove. */}
                  <span
                    className="admin-pill"
                    data-tone={
                      !destination.last_test_ok
                        ? "danger"
                        : destination.last_test_conclusive
                          ? "success"
                          : "warn"
                    }
                  >
                    {!destination.last_test_ok
                      ? "Failed"
                      : destination.last_test_conclusive
                        ? "Passed"
                        : "Inconclusive"}
                  </span>{" "}
                  Tested <Ago iso={destination.last_test_at} /> —{" "}
                  {destination.last_test_message}
                </p>
              ) : (
                <p className="admin-note">
                  Never tested. Credentials being present is not evidence they
                  work.
                </p>
              )}
            </div>

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
        <h2>What forwards today</h2>
        <p className="admin-note">
          <strong>GA4 only, and only <code>generate_lead</code>.</strong> It is
          sent from the enquiry form&rsquo;s server action the moment the
          database confirms the lead — after the visitor already has their
          answer, so a slow or failing GA4 can never make someone wait or turn a
          saved lead into an error.
        </p>
        <p className="admin-note">
          Nothing else is forwarded, and that is a rule in code rather than a
          setting. GA4 does not deduplicate by <code>event_id</code> the way
          Meta and TikTok do, so an event sent from both the browser and the
          Measurement Protocol is counted twice with no error anywhere.{" "}
          <code>page_view</code> is denied by name. The counters above are real:
          a skip is recorded with its reason, not silently dropped.
        </p>
        <p className="admin-note">
          Meta, Google Ads, TikTok and server-side GTM are{" "}
          <strong>not built</strong>. Their credentials store and their Test
          buttons work, but no event has ever been forwarded to them. Each is a
          new file implementing the same adapter — see{" "}
          <code>lib/forwarding/types.ts</code>.
        </p>
      </section>
    </>
  );
}
