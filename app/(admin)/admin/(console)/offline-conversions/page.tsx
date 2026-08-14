import type { Metadata } from "next";
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
      <div className="admin-pagehead">
        <h1>Offline conversions</h1>
        <p>
          Sending the outcome back to the ad platform, so it optimises for
          customers rather than for form fills. Every lead that does not go
          gets a reason — an upload that reports &ldquo;12 of 40 sent&rdquo;
          and forgets the other 28 is how these quietly stop working.
        </p>
      </div>

      <section className="admin-card">
        <h2>Build a batch</h2>
        <SavingForm action={buildUpload} className="admin-inline-form" submitLabel="Dry run" pendingLabel="Building…">
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
          <input
            id="conversion_action"
            name="conversion_action"
            className="admin-select"
            placeholder="Conversion action name"
            defaultValue="Booked call"
          />
        </SavingForm>
        <p className="admin-note">
          Dry run is the only mode. Nothing is sent to any platform — that needs
          API credentials this project does not hold. Export the CSV below and
          import it by hand.
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
            Build one above. With no leads in the database it will come back
            empty, which is itself the correct answer.
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
                <td style={{ color: "var(--ink)" }}>{batch.destination}</td>
                <td>{batch.conversion_action ?? "—"}</td>
                <td>{batch.row_count}</td>
                <td>{batch.row_count - batch.rejected_count}</td>
                <td>{batch.rejected_count}</td>
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
                        "—"
                      )}
                      <div style={{ color: "var(--ink-muted)" }}>{row.click_id_kind}</div>
                    </td>
                    <td>
                      {row.value === null ? "—" : `${row.value} ${row.currency ?? ""}`}
                    </td>
                    <td>{row.conversion_time ? <Ago iso={row.conversion_time} /> : "—"}</td>
                    <td style={{ maxWidth: "44ch" }}>{row.reason ?? "—"}</td>
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
