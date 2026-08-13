import type { Metadata } from "next";
import { AdminState, AdminTable, Ago } from "@/components/admin/Table";
import { createClient } from "@/lib/supabase/server";
import { setLeadStatus } from "./actions";
import { LEAD_STATUSES } from "./statuses";

export const metadata: Metadata = {
  title: "Leads",
  robots: { index: false, follow: false },
};

const TONE: Record<string, string> = {
  new: "info",
  contacted: "info",
  qualified: "warn",
  booked: "warn",
  won: "success",
  lost: "danger",
};

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  // Narrowed against the enum rather than cast: an unknown ?status= in the URL
  // becomes "no filter", not a query that errors.
  const filtering =
    LEAD_STATUSES.find((value) => value === status) ?? null;

  const supabase = await createClient();

  let query = supabase
    .from("leads")
    .select(
      `id, created_at, name, email, company, platform, answers, status,
       source, medium, campaign, landing_page, gclid, fbclid, ttclid, msclkid`,
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (filtering) query = query.eq("status", filtering);

  const [{ data, error }, total] = await Promise.all([
    query,
    supabase.from("leads").select("*", { count: "exact", head: true }),
  ]);

  const anyLeads = (total.count ?? 0) > 0;

  return (
    <>
      <div className="admin-pagehead">
        <h1>Leads</h1>
        <p>
          Attribution is frozen onto each lead when it arrives, copied from the
          session&rsquo;s <em>first</em> touch. It is never read from the
          browser: a page that could name its own source could credit any
          campaign it liked.
        </p>
      </div>

      <nav className="admin-filters" aria-label="Filter by status">
        <a
          href="/admin/leads"
          className="admin-navlink"
          data-compact="true"
          aria-current={!filtering ? "page" : undefined}
        >
          All
        </a>
        {LEAD_STATUSES.map((value) => (
          <a
            key={value}
            href={`/admin/leads?status=${value}`}
            className="admin-navlink"
            data-compact="true"
            aria-current={filtering === value ? "page" : undefined}
          >
            {value}
          </a>
        ))}
      </nav>

      <section className="admin-card">
        {error ? (
          <AdminState tone="error" title="Could not read leads.">
            {error.message}
          </AdminState>
        ) : !data?.length ? (
          anyLeads ? (
            <AdminState tone="filtered" title={`No leads with status "${filtering}".`}>
              Other statuses still have leads — clear the filter to see them.
            </AdminState>
          ) : (
            <AdminState title="No leads yet.">
              The enquiry form in the Contact section writes here. Nothing has
              been submitted so far.
            </AdminState>
          )
        ) : (
          <AdminTable
            caption="Leads"
            columns={["When", "Who", "Platform", "First touch", "Problem", "Status"]}
          >
            {data.map((lead) => {
              const answers = (lead.answers ?? {}) as { problem?: string };
              const clickId =
                (lead.gclid && "gclid") ||
                (lead.fbclid && "fbclid") ||
                (lead.ttclid && "ttclid") ||
                (lead.msclkid && "msclkid") ||
                null;

              return (
                <tr key={lead.id}>
                  <td>
                    <Ago iso={lead.created_at} />
                  </td>
                  <td style={{ color: "var(--ink)" }}>
                    {lead.name}
                    <div>
                      <a href={`mailto:${lead.email}`}>{lead.email}</a>
                    </div>
                    {lead.company ? (
                      <div style={{ color: "var(--ink-muted)" }}>{lead.company}</div>
                    ) : null}
                  </td>
                  <td>{lead.platform ?? "—"}</td>
                  <td>
                    {lead.source ?? "—"}
                    {lead.medium ? ` / ${lead.medium}` : ""}
                    {lead.campaign ? (
                      <div style={{ color: "var(--ink-muted)" }}>{lead.campaign}</div>
                    ) : null}
                    {clickId ? (
                      <div>
                        <span className="admin-pill" data-tone="info">
                          {clickId}
                        </span>
                      </div>
                    ) : null}
                  </td>
                  <td style={{ maxWidth: "34ch" }}>{answers.problem ?? "—"}</td>
                  <td>
                    <form action={setLeadStatus} className="admin-inline-form">
                      <input type="hidden" name="id" value={lead.id} />
                      <span className="admin-pill" data-tone={TONE[lead.status]}>
                        {lead.status}
                      </span>
                      <label className="sr-only" htmlFor={`status-${lead.id}`}>
                        Status for {lead.name}
                      </label>
                      <select
                        id={`status-${lead.id}`}
                        name="status"
                        defaultValue={lead.status}
                        className="admin-select"
                      >
                        {LEAD_STATUSES.map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                      {/* A submit button, not an onChange handler: this works
                          without JavaScript and never fires a write because a
                          keyboard user arrowed past an option. */}
                      <button type="submit" className="admin-button" data-variant="ghost">
                        Save
                      </button>
                    </form>
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
