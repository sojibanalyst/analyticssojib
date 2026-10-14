import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminState, AdminTable, Ago } from "@/components/admin/Table";
import { SavingForm } from "@/components/admin/SavingForm";
import { createClient } from "@/lib/supabase/server";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { LeadsWorkspace, type LeadRow } from "@/components/admin/leads/LeadsWorkspace";
import { HelpTip, PageHeader } from "@/components/admin/ui/Basics";
import { eraseRejection, rescueRejection } from "./actions";

export const metadata: Metadata = {
  title: "Leads",
  robots: { index: false, follow: false },
};

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  // Archived leads are out of the way, not gone. One query parameter switches
  // between the working list and everything that has been put aside.
  const showingArchived = view === "archived";

  const supabase = await createClient();

  let query = supabase
    .from("leads")
    .select(
      `id, created_at, name, email, company, platform, answers, status,
       source, medium, campaign, term, content, landing_page, referrer,
       last_touch_source, last_touch_medium, last_touch_campaign,
       last_landing_page, last_referrer, first_seen_at, attribution_status,
       gclid, fbclid, ttclid, msclkid, wbraid, gbraid, li_fat_id,
       origin, booked_at, canceled_at, calendly_invitee_uri, archived_at, notes`,
    )
    .order("created_at", { ascending: false })
    .limit(200);

  query = showingArchived
    ? query.not("archived_at", "is", null)
    : query.is("archived_at", null);

  // Expired refusals are cleared on the way in. No scheduler to depend on, and
  // the cost is one bounded DELETE on a page an admin is already loading.
  await supabase.rpc("purge_expired_rejections");

  const [{ data, error }, rejections, log] = await Promise.all([
    query,
    // Everything the form refused. A rejection nobody can see is
    // indistinguishable from a lost lead — which is exactly how one was lost.
    supabase
      .from("lead_rejections")
      .select("id, created_at, reason, name, email, company, answers")
      .order("created_at", { ascending: false })
      .limit(50),
    // A row vanishing with no trace is how a console starts lying.
    supabase
      .from("deletion_log")
      .select("id, at, action, subject, detail, affected")
      .order("at", { ascending: false })
      .limit(20),
  ]);


  return (
    <>
      <PageHeader
        title={showingArchived ? "Archived leads" : "Leads"}
        subtitle="Enquiries and booked calls. Drag a card on the board to change its status."
        help="Attribution is recorded from the request that brought the visitor, never from the browser. Open a lead to see it."
      />

      {rejections.data?.length ? (
        <section className="admin-card">
          <h2>
            Refused submissions{" "}
            <HelpTip text="Usually bots, but an autofilled hidden field can catch a real person. Rescue moves one into Leads. These are cleared after 30 days." />
          </h2>
          <p className="admin-note">Turned away by the form. Rescue anyone real.</p>
          <AdminTable
            caption="Refused submissions"
            columns={["When", "Reason", "Who", "Message", ""]}
          >
            {rejections.data.map((row) => {
              const answers = (row.answers ?? {}) as { problem?: string };
              return (
                <tr key={row.id}>
                  <td>
                    <Ago iso={row.created_at} />
                  </td>
                  <td>
                    <span
                      className="admin-pill"
                      data-tone={row.reason === "honeypot" ? "warn" : "info"}
                    >
                      {row.reason}
                    </span>
                  </td>
                  <td style={{ color: "var(--ink)" }}>
                    {row.name || "None"}
                    {row.email ? (
                      <div>
                        <a href={`mailto:${row.email}`}>{row.email}</a>
                      </div>
                    ) : null}
                    {row.company ? (
                      <div style={{ color: "var(--ink-muted)" }}>{row.company}</div>
                    ) : null}
                  </td>
                  <td style={{ maxWidth: "40ch" }}>{answers.problem ?? "None"}</td>
                  <td>
                    {/* Rescue first: the common mistake here is a real person,
                        and the recovery should be easier than the deletion. */}
                    <SavingForm
                      action={rescueRejection}
                      className="admin-inline-form"
                      submitLabel="Rescue"
                      pendingLabel="Moving..."
                      variant="ghost"
                    >
                      <input type="hidden" name="id" value={row.id} />
                    </SavingForm>
                    <DeleteButton action={eraseRejection} id={row.id} label="Erase" />
                  </td>
                </tr>
              );
            })}
          </AdminTable>
        </section>
      ) : null}

      {error ? (
        <AdminState tone="error" title="Could not read leads.">
          {error.message}
        </AdminState>
      ) : (
        <Suspense>
          <LeadsWorkspace leads={(data ?? []) as unknown as LeadRow[]} archived={showingArchived} />
        </Suspense>
      )}

      {log.data?.length ? (
        <section className="admin-card">
          <h2>Deletion log</h2>
          <p className="admin-note">Every archive, erasure and expiry. Addresses are masked.</p>
          <AdminTable caption="Deletion log" columns={["When", "What", "Subject", "Note"]}>
            {log.data.map((row) => (
              <tr key={row.id}>
                <td>
                  <Ago iso={row.at} />
                </td>
                <td>
                  <span
                    className="admin-pill"
                    data-tone={
                      row.action === "lead_erased" || row.action === "rejection_erased"
                        ? "danger"
                        : row.action === "rejection_rescued" || row.action === "lead_restored"
                          ? "success"
                          : "info"
                    }
                  >
                    {row.action.replace(/_/g, " ")}
                  </span>
                  {row.affected > 1 ? (
                    <span className="admin-num"> ×{row.affected}</span>
                  ) : null}
                </td>
                <td className="admin-mono">{row.subject ?? "None"}</td>
                <td style={{ maxWidth: "44ch" }}>{row.detail ?? "None"}</td>
              </tr>
            ))}
          </AdminTable>
        </section>
      ) : null}
    </>
  );
}
