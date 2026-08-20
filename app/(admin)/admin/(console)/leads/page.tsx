import type { Metadata } from "next";
import { Fragment } from "react";
import Link from "next/link";
import { AdminState, AdminTable, Ago } from "@/components/admin/Table";
import { SavingForm } from "@/components/admin/SavingForm";
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
       source, medium, campaign, term, content, landing_page, referrer,
       last_touch_source, last_touch_medium, last_touch_campaign,
       last_landing_page, last_referrer, first_seen_at, attribution_status,
       gclid, fbclid, ttclid, msclkid, wbraid, gbraid, li_fat_id`,
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
          Attribution is frozen onto each lead when it arrives, read from the
          request that brought the visitor here — the URL&rsquo;s parameters and
          the Referer header — and never from the browser: a page that could
          name its own source could credit any campaign it liked. It no longer
          depends on sessions, so it keeps working with no consent interface.
          Open <em>Attribution</em> under any lead for the last touch, the
          landing pages and the click ids.
        </p>
      </div>

      {/* prefetch={false}: see the same nav on /admin/events. Seven chips, all
          pointing at a page that queries Supabase twice, would otherwise be
          seven prefetched round trips for filters nobody clicked. */}
      <nav className="admin-filters" aria-label="Filter by status">
        <Link
          href="/admin/leads"
          prefetch={false}
          className="admin-navlink"
          data-compact="true"
          aria-current={!filtering ? "page" : undefined}
        >
          All
        </Link>
        {LEAD_STATUSES.map((value) => (
          <Link
            key={value}
            href={`/admin/leads?status=${value}`}
            prefetch={false}
            className="admin-navlink"
            data-compact="true"
            aria-current={filtering === value ? "page" : undefined}
          >
            {value}
          </Link>
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
              // Seven now, not four. wbraid and gbraid are Google's iOS
              // web-to-app ids and are NOT gclid — an upload against the wrong
              // parameter is rejected, so they are named separately here too.
              const clickIds = (
                [
                  ["gclid", lead.gclid],
                  ["wbraid", lead.wbraid],
                  ["gbraid", lead.gbraid],
                  ["fbclid", lead.fbclid],
                  ["ttclid", lead.ttclid],
                  ["msclkid", lead.msclkid],
                  ["li_fat_id", lead.li_fat_id],
                ] as const
              ).filter(([, value]) => Boolean(value));
              const clickId = clickIds[0]?.[0] ?? null;

              return (
                <Fragment key={lead.id}>
                <tr>
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
                  {/*
                    First touch stays one column, and everything else moves
                    into the row below rather than becoming columns seven
                    through fourteen. Six was already wide; the campaign that
                    closed it, the landing pages, the referrers and seven click
                    ids would have made the table unreadable to answer a
                    question nobody asks about every lead at once.

                    Empty is not direct. "Direct" means the first request was
                    seen and carried nothing; "not captured" means nothing was
                    ever seen, which is a failure and says so.
                  */}
                  <td className="admin-mono">
                    {lead.attribution_status === "unknown" ? (
                      <span className="admin-pill" data-tone="warn">
                        Not captured
                      </span>
                    ) : lead.source ? (
                      <>
                        {lead.source}
                        {lead.medium ? ` / ${lead.medium}` : ""}
                        {lead.campaign ? (
                          <div style={{ color: "var(--ink-muted)" }}>{lead.campaign}</div>
                        ) : null}
                      </>
                    ) : (
                      <span className="admin-pill" data-tone="info">
                        Direct
                      </span>
                    )}
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
                    {/* A submit button, not an onChange handler: this works
                        without JavaScript and never fires a write because a
                        keyboard user arrowed past an option. */}
                    <SavingForm
                      action={setLeadStatus}
                      className="admin-inline-form"
                      variant="ghost"
                    >
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
                    </SavingForm>
                  </td>
                </tr>

                {/*
                  The rest of the attribution, in a row under the lead rather
                  than in columns seven through fourteen. Six was already wide,
                  and the closing campaign, both landing pages, both referrers
                  and seven click ids are not something anyone reads about
                  every lead at once. <details> keeps it closed by default: no
                  JavaScript, keyboard operable, browser-managed state.
                */}
                <tr>
                  <td colSpan={6} style={{ paddingTop: 0 }}>
                    <details className="admin-collapse">
                      <summary>
                        <span>Attribution</span>
                        <span
                          className="admin-pill"
                          data-tone={
                            lead.attribution_status === "captured"
                              ? "success"
                              : lead.attribution_status === "direct"
                                ? "info"
                                : "warn"
                          }
                        >
                          {lead.attribution_status === "captured"
                            ? "Captured"
                            : lead.attribution_status === "direct"
                              ? "Direct"
                              : "Not captured"}
                        </span>
                      </summary>

                      {lead.attribution_status === "unknown" ? (
                        <p className="admin-note">
                          Nothing was observed for this visitor — no attribution
                          cookie reached the server. That is a capture failure,
                          not direct traffic, and the two are deliberately not
                          shown as the same thing. Most likely: the enquiry
                          predates attribution capture, or first-party cookies
                          were blocked.
                        </p>
                      ) : (
                        <AdminTable
                          caption="Attribution for this lead"
                          columns={["", "First touch", "Last touch"]}
                        >
                          <tr>
                            <td>Source / medium</td>
                            <td className="admin-mono">
                              {lead.source ?? "—"}
                              {lead.medium ? ` / ${lead.medium}` : ""}
                            </td>
                            <td className="admin-mono">
                              {lead.last_touch_source ?? "—"}
                              {lead.last_touch_medium ? ` / ${lead.last_touch_medium}` : ""}
                            </td>
                          </tr>
                          <tr>
                            <td>Campaign</td>
                            <td className="admin-mono">{lead.campaign ?? "—"}</td>
                            <td className="admin-mono">{lead.last_touch_campaign ?? "—"}</td>
                          </tr>
                          <tr>
                            <td>Term / content</td>
                            <td className="admin-mono">
                              {lead.term ?? "—"}
                              {lead.content ? ` / ${lead.content}` : ""}
                            </td>
                            <td className="admin-mono">—</td>
                          </tr>
                          <tr>
                            <td>Landing page</td>
                            <td className="admin-mono">{lead.landing_page ?? "—"}</td>
                            <td className="admin-mono">{lead.last_landing_page ?? "—"}</td>
                          </tr>
                          <tr>
                            <td>Referrer</td>
                            <td className="admin-mono">{lead.referrer ?? "—"}</td>
                            <td className="admin-mono">{lead.last_referrer ?? "—"}</td>
                          </tr>
                          <tr>
                            <td>Click ids</td>
                            <td className="admin-mono" colSpan={2}>
                              {clickIds.length
                                ? clickIds.map(([name, value]) => (
                                    <div key={name}>
                                      {name}={value}
                                    </div>
                                  ))
                                : "none"}
                            </td>
                          </tr>
                          <tr>
                            <td>First seen</td>
                            <td className="admin-mono" colSpan={2}>
                              {lead.first_seen_at ? <Ago iso={lead.first_seen_at} /> : "—"}
                            </td>
                          </tr>
                        </AdminTable>
                      )}
                    </details>
                  </td>
                </tr>
                </Fragment>
              );
            })}
          </AdminTable>
        )}
      </section>
    </>
  );
}
