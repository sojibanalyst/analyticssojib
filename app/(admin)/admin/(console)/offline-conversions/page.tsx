import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui/Basics";
import { AdminState, AdminTable, Ago } from "@/components/admin/Table";
import { SavingForm } from "@/components/admin/SavingForm";
import { createClient } from "@/lib/supabase/server";
import { DESTINATION_CLICK_ID } from "@/lib/offline";
import { buildUpload } from "./actions";

export const metadata: Metadata = {
  title: "Offline conversions",
  robots: { index: false, follow: false },
};

export default async function OfflineConversionsPage({
  searchParams,
}: {
  searchParams: Promise<{ upload?: string }>;
}) {
  const { upload: selected } = await searchParams;
  const supabase = await createClient();

  const { data: uploads, error } = await supabase
    .from("offline_conversion_uploads")
    .select("id, created_at, destination, conversion_action, status, dry_run, row_count, accepted_count, rejected_count, result_message, currency")
    .order("created_at", { ascending: false })
    .limit(20);

  const current = selected ?? uploads?.[0]?.id ?? null;

  const { data: rows } = current
    ? await supabase
        .from("offline_conversion_rows")
        .select("id, lead_id, result, reason, click_id, click_id_kind, value, currency, conversion_time")
        .eq("upload_id", current)
        .order("result", { ascending: true })
        .limit(500)
    : { data: null };

  const eligible = (rows ?? []).filter((row) => row.result === "eligible");

  return (
    <>
      <PageHeader
        title="Offline conversions"
        subtitle={"Send outcomes back to the ad platform. Every skipped lead gets a reason."}
        help="So the platform optimises for customers, not form fills."
      />

      <section className="admin-card">
        <h2>Build a batch</h2>
        <SavingForm action={buildUpload} className="admin-inline-form" submitLabel="Run dry run" pendingLabel="Building...">
          <label className="sr-only" htmlFor="destination">
            Destination
          </label>
          <select id="destination" name="destination" className="admin-select" defaultValue="google_ads">
            {Object.entries(DESTINATION_CLICK_ID).map(([key, meta]) => (
              <option key={key} value={key}>
                {key} · needs {meta.column}
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor="conversion_action">
            Conversion action name
          </label>
          {/* .admin-input, not .admin-select — it is a text field, and
              borrowing the select's class is how it inherited the select's
              wrong metrics in the first place. Both now match .admin-field. */}
          <input
            id="conversion_action"
            name="conversion_action"
            className="admin-input"
            placeholder="Conversion action name"
            defaultValue="Booked call"
          />
        </SavingForm>
        <p className="admin-note">
          Dry run only: nothing is sent. Export the CSV and import it by hand.
        </p>
      </section>

      <section className="admin-card">
        <h2>Batches</h2>
        {error ? (
          <AdminState tone="error" title="Could not read uploads.">
            {error.message}
          </AdminState>
        ) : !uploads?.length ? (
          <AdminState title="No batches built yet.">
            Build one above with Run dry run.
          </AdminState>
        ) : (
          <AdminTable
            caption="Upload batches"
            columns={["When", "Destination", "Action", "Rows", "Eligible", "Rejected", "Result"]}
          >
            {uploads.map((batch) => (
              <tr key={batch.id} aria-current={batch.id === current ? "true" : undefined}>
                <td>
                  <a href={`/admin/offline-conversions?upload=${batch.id}`}>
                    <Ago iso={batch.created_at} />
                  </a>
                </td>
                <td className="admin-mono" style={{ color: "var(--ink)" }}>{batch.destination}</td>
                <td>{batch.conversion_action ?? "None"}</td>
                <td className="admin-num">{batch.row_count}</td>
                <td className="admin-num">{batch.row_count - batch.rejected_count}</td>
                <td className="admin-num">{batch.rejected_count}</td>
                <td>
                  <span className="admin-pill" data-tone={batch.dry_run ? "info" : "success"}>
                    {batch.dry_run ? "Dry run" : batch.status}
                  </span>
                  <div>{batch.result_message ?? ""}</div>
                </td>
              </tr>
            ))}
          </AdminTable>
        )}
      </section>

      {current ? (
        <section className="admin-card">
          <h2>Rows in this batch</h2>
          {!rows?.length ? (
            <AdminState title="This batch has no rows.">
              There were no leads to evaluate when it was built.
            </AdminState>
          ) : (
            <>
              <p className="admin-note">
                {eligible.length} eligible of {rows.length}.
              </p>
              {eligible.length ? (
                <a
                  href={`/admin/offline-conversions/export?upload=${current}`}
                  className="admin-button"
                  style={{ alignSelf: "flex-start", textDecoration: "none" }}
                  download
                >
                  Download CSV
                </a>
              ) : null}
              <AdminTable
                caption="Evaluated rows"
                columns={["Result", "Click ID", "Value", "When", "Why not"]}
              >
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <span
                        className="admin-pill"
                        data-tone={row.result === "eligible" ? "success" : "warn"}
                      >
                        {row.result}
                      </span>
                    </td>
                    <td>
                      {row.click_id ? (
                        <code>{row.click_id.slice(0, 14)}</code>
                      ) : (
                        "None"
                      )}
                      <div style={{ color: "var(--ink-muted)" }}>{row.click_id_kind}</div>
                    </td>
                    <td>
                      {row.value === null ? "None" : `${row.value} ${row.currency ?? ""}`}
                    </td>
                    <td>{row.conversion_time ? <Ago iso={row.conversion_time} /> : "None"}</td>
                    <td style={{ maxWidth: "44ch" }}>{row.reason ?? "None"}</td>
                  </tr>
                ))}
              </AdminTable>
            </>
          )}
        </section>
      ) : null}
    </>
  );
}
