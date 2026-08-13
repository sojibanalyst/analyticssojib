import type { Metadata } from "next";
import { AdminState } from "@/components/admin/Table";
import { createClient } from "@/lib/supabase/server";
import { updateCaseStudy } from "../content-actions";

export const metadata: Metadata = {
  title: "Case studies",
  robots: { index: false, follow: false },
};

export default async function CaseStudiesPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("case_studies")
    .select(
      `id, slug, code, title, body, status, needs_confirmation,
       metric_caption, metric_before, metric_after,
       case_study_stats (value, unit, label, sort_order)`,
    )
    .order("sort_order", { ascending: true });

  const unconfirmed = (data ?? []).filter((row) => row.needs_confirmation);

  return (
    <>
      <div className="admin-pagehead">
        <h1>Case studies</h1>
        <p>
          The headline text and visibility are editable here. Figures, stats and
          screenshots are not — changing a published number is a decision, not a
          typo fix, and it belongs in a migration where it leaves a trace.
        </p>
      </div>

      {unconfirmed.length ? (
        <section className="admin-card">
          <p className="admin-note" data-tone="danger">
            {unconfirmed.length} case study carries figures you have not
            confirmed: {unconfirmed.map((row) => row.code).join(", ")}. Until
            the tick below is cleared, treat those numbers as my construction
            rather than as fact.
          </p>
        </section>
      ) : null}

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

            <form action={updateCaseStudy} className="admin-form">
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

                <button type="submit" className="admin-button">
                  Save
                </button>
              </div>
            </form>
          </section>
        ))
      )}
    </>
  );
}
