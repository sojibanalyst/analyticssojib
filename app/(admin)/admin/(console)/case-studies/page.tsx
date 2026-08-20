import type { Metadata } from "next";
import { AdminState } from "@/components/admin/Table";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { SavingForm } from "@/components/admin/SavingForm";
import { createClient } from "@/lib/supabase/server";
import { createCaseStudy, deleteCaseStudy, updateCaseStudy } from "../content-actions";

export const metadata: Metadata = {
  title: "Case studies",
  robots: { index: false, follow: false },
};

export default async function CaseStudiesPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("case_studies")
    .select(
      `id, slug, code, title, body, intro, status, needs_confirmation,
       metric_caption, metric_before, metric_after,
       metric_before_label, metric_after_label,
       metric_before_pct, metric_after_pct,
       case_study_stats (value, unit, label, sort_order)`,
    )
    .order("sort_order", { ascending: true });

  const unconfirmed = (data ?? []).filter((row) => row.needs_confirmation);

  /**
   * Published AND unconfirmed — the combination that should not sit unnoticed.
   *
   * Each half is legitimate on its own: a draft may hold unconfirmed figures
   * while it is being written, and a published study may be fully confirmed.
   * Together they mean numbers are on the public internet that the person who
   * published them has not stood behind. Not blocked — whether to publish is
   * Sojib's call and the console does not get a veto — but it is stated at the
   * top of the screen so the state has to be a decision rather than an
   * oversight. The public page already withholds its reconciliation claim for
   * exactly these; see lib/case-study.ts.
   */
  const liveUnconfirmed = unconfirmed.filter((row) => row.status === "published");

  return (
    <>
      <div className="admin-pagehead">
        <h1>Case studies</h1>
        <p>
          Text, figures and visibility are all editable. The stats row and the
          screenshots are not: a screenshot has to be cropped so it carries no
          client identifiers, and that is a review step rather than a form
          field. Send me a new one and I will add it.
        </p>
      </div>

      {liveUnconfirmed.length ? (
        <section className="admin-card">
          <p className="admin-note" data-tone="danger">
            <strong>
              {liveUnconfirmed.length === 1 ? "One case study is" : `${liveUnconfirmed.length} case studies are`}{" "}
              live with unconfirmed figures
            </strong>{" "}
            — {liveUnconfirmed.map((row) => row.code).join(", ")}. Published and
            readable by anyone, carrying numbers you have not stood behind.
            Either confirm the figures with the tick on the card, or set the
            status back to draft. Nothing is blocking you: the public page is
            already withholding its &ldquo;every figure was reconciled&rdquo;
            line for these, so the site is not claiming more than you have.
          </p>
        </section>
      ) : null}

      {unconfirmed.length > liveUnconfirmed.length ? (
        <section className="admin-card">
          <p className="admin-note" data-tone="danger">
            {unconfirmed.length - liveUnconfirmed.length} draft case study
            carries figures you have not confirmed. Until the tick is cleared,
            treat those numbers as my construction rather than as fact.
          </p>
        </section>
      ) : null}

      <section className="admin-card">
        <h2>Add a case study</h2>
        <SavingForm action={createCaseStudy} submitLabel="Create">
          <div className="admin-field">
            <label htmlFor="new-cs-title">Title</label>
            <input id="new-cs-title" name="title" required />
          </div>
          <div className="admin-field">
            <label htmlFor="new-cs-code">Code — e.g. CASE_012 / SHOPIFY / DE</label>
            <input id="new-cs-code" name="code" />
          </div>
          <div className="admin-field">
            <label htmlFor="new-cs-body">Card summary</label>
            <textarea id="new-cs-body" name="body" rows={3} />
          </div>
          <div className="admin-field">
            <label htmlFor="new-cs-tags">Tags — comma separated</label>
            <input id="new-cs-tags" name="tags" placeholder="SGTM, META CAPI, BIGQUERY" />
          </div>
          <p className="admin-note">
            Created hidden. Fill in the figures, then switch it to published —
            a case study with no numbers should not appear the second it exists.
          </p>
        </SavingForm>
      </section>

      {error ? (
        <section className="admin-card">
          <AdminState tone="error" title="Could not read case studies.">
            {error.message}
          </AdminState>
        </section>
      ) : (
        (data ?? []).map((item) => (
          <section className="admin-card" key={item.id}>
            <h2>
              /case-studies/{item.slug}
              {item.needs_confirmation ? (
                <span className="admin-pill" data-tone="warn" style={{ marginLeft: "10px" }}>
                  Figures unconfirmed
                </span>
              ) : null}
            </h2>

            <p className="admin-note">
              {item.code} — {item.metric_caption}: {item.metric_before} →{" "}
              {item.metric_after}
              {item.case_study_stats.length
                ? ` · ${item.case_study_stats.length} stats`
                : ""}
            </p>

            <SavingForm action={updateCaseStudy}>
              <input type="hidden" name="id" value={item.id} />

              <div className="admin-field">
                <label htmlFor={`cs-title-${item.id}`}>Title</label>
                <input id={`cs-title-${item.id}`} name="title" defaultValue={item.title} />
              </div>

              <div className="admin-field">
                <label htmlFor={`cs-body-${item.id}`}>Card summary</label>
                <textarea
                  id={`cs-body-${item.id}`}
                  name="body"
                  rows={4}
                  defaultValue={item.body}
                />
              </div>

              <div className="admin-field">
                <label htmlFor={`cs-intro-${item.id}`}>
                  Intro — the first paragraph of the full case page
                </label>
                <textarea
                  id={`cs-intro-${item.id}`}
                  name="intro"
                  rows={3}
                  defaultValue={item.intro}
                />
              </div>

              <div className="admin-field">
                <label htmlFor={`cs-caption-${item.id}`}>Metric caption</label>
                <input
                  id={`cs-caption-${item.id}`}
                  name="metric_caption"
                  defaultValue={item.metric_caption ?? ""}
                />
              </div>

              <div className="admin-inline-form">
                <label htmlFor={`cs-bl-${item.id}`}>Before</label>
                <input
                  id={`cs-bl-${item.id}`}
                  name="metric_before_label"
                  className="admin-select"
                  size={8}
                  defaultValue={item.metric_before_label ?? ""}
                />
                <input
                  name="metric_before"
                  className="admin-select"
                  size={6}
                  aria-label="Before value"
                  defaultValue={item.metric_before ?? ""}
                />
                <input
                  name="metric_before_pct"
                  className="admin-select"
                  size={4}
                  type="number"
                  min={0}
                  max={100}
                  aria-label="Before bar percentage"
                  defaultValue={item.metric_before_pct ?? ""}
                />

                <label htmlFor={`cs-al-${item.id}`}>After</label>
                <input
                  id={`cs-al-${item.id}`}
                  name="metric_after_label"
                  className="admin-select"
                  size={8}
                  defaultValue={item.metric_after_label ?? ""}
                />
                <input
                  name="metric_after"
                  className="admin-select"
                  size={6}
                  aria-label="After value"
                  defaultValue={item.metric_after ?? ""}
                />
                <input
                  name="metric_after_pct"
                  className="admin-select"
                  size={4}
                  type="number"
                  min={0}
                  max={100}
                  aria-label="After bar percentage"
                  defaultValue={item.metric_after_pct ?? ""}
                />
              </div>
              <p className="admin-note">
                The two numbers on the right are the bar lengths, 0–100. The
                values beside them are what the visitor reads.
              </p>

              <div className="admin-inline-form">
                <label htmlFor={`cs-status-${item.id}`}>Status</label>
                <select
                  id={`cs-status-${item.id}`}
                  name="status"
                  className="admin-select"
                  defaultValue={item.status}
                >
                  <option value="published">published</option>
                  <option value="draft">draft — removes the page</option>
                </select>

                <label className="admin-check">
                  <input
                    type="checkbox"
                    name="needs_confirmation"
                    defaultChecked={item.needs_confirmation}
                  />
                  Figures still unconfirmed
                </label>
              </div>
            </SavingForm>

            <DeleteButton action={deleteCaseStudy} id={item.id} label="Delete case study" />
          </section>
        ))
      )}
    </>
  );
}
