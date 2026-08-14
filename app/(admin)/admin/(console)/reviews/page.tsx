import type { Metadata } from "next";
import { AdminState } from "@/components/admin/Table";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { SavingForm } from "@/components/admin/SavingForm";
import { createClient } from "@/lib/supabase/server";
import { createReview, deleteReview, updateReview } from "../content-actions";

export const metadata: Metadata = {
  title: "Reviews",
  robots: { index: false, follow: false },
};

type Row = {
  id: string;
  quote: string | null;
  attribution: string | null;
  is_placeholder: boolean;
  published: boolean;
};

/**
 * The editing form for one written review.
 *
 * Shared between the expanded (real) and collapsed (placeholder) cards, so the
 * two can never drift into offering different fields.
 */
function ReviewForm({ row }: { row: Row }) {
  return (
    <>
      <SavingForm action={updateReview}>
        <input type="hidden" name="id" value={row.id} />

        <div className="admin-field">
          <label htmlFor={`quote-${row.id}`}>Quote — verbatim</label>
          <textarea id={`quote-${row.id}`} name="quote" rows={4} defaultValue={row.quote ?? ""} />
        </div>

        <div className="admin-field">
          <label htmlFor={`attr-${row.id}`}>
            Attribution — e.g. Hannah R. · Skincare DTC · UK
          </label>
          <input id={`attr-${row.id}`} name="attribution" defaultValue={row.attribution ?? ""} />
        </div>

        <label className="admin-check">
          <input type="checkbox" name="published" defaultChecked={row.published} />
          Show on the site
        </label>
      </SavingForm>

      <DeleteButton action={deleteReview} id={row.id} label="Delete review" />
    </>
  );
}

export default async function ReviewsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("reviews")
    .select(
      "id, type, quote, attribution, client_name, company, is_placeholder, published, youtube_id, sort_order",
    )
    .order("type", { ascending: true })
    .order("sort_order", { ascending: true });

  const written = (data ?? []).filter((row) => row.type === "written");
  const video = (data ?? []).filter((row) => row.type === "video");
  const placeholders = written.filter((row) => row.is_placeholder).length;

  return (
    <>
      <div className="admin-pagehead">
        <h1>Reviews</h1>
        <p>
          Paste each client&rsquo;s own words, unedited. A slot stops counting
          as a placeholder the moment it stops containing the placeholder
          text — that flag is derived, never typed, so it cannot drift from
          what is actually on the page.
        </p>
      </div>

      {placeholders > 0 ? (
        <section className="admin-card">
          <p className="admin-note" data-tone="danger">
            {placeholders} of {written.length} written review slots are still
            placeholders, collapsed below. They render on the live site as
            clearly-labelled empty slots — never as a real quote.
          </p>
        </section>
      ) : null}

      <section className="admin-card">
        <h2>Add a review</h2>
        <SavingForm action={createReview} submitLabel="Add review">
          <div className="admin-field">
            <label htmlFor="new-quote">Quote — the client&rsquo;s own words, unedited</label>
            <textarea id="new-quote" name="quote" rows={4} required />
          </div>
          <div className="admin-field">
            <label htmlFor="new-attr">Attribution — e.g. Hannah R. · Skincare DTC · UK</label>
            <input id="new-attr" name="attribution" />
          </div>
          <p className="admin-note">
            There is no limit. The slots below came from the original design as
            empty placeholders — add as many real ones as you have, and delete
            the slots you never fill.
          </p>
        </SavingForm>
      </section>

      {error ? (
        <section className="admin-card">
          <AdminState tone="error" title="Could not read reviews.">
            {error.message}
          </AdminState>
        </section>
      ) : (
        <>
          <section className="admin-card">
            <h2>Video reviews</h2>
            <p className="admin-note">
              Edited here only for the name and company shown beneath. Quotes
              are left empty unless the client actually said the words —
              nothing is paraphrased from a video.
            </p>
            <ul style={{ margin: 0, paddingLeft: "18px" }}>
              {video.map((row) => (
                <li key={row.id}>
                  {row.client_name ?? "Unnamed"}
                  {row.company ? ` · ${row.company}` : ""} — youtube:{" "}
                  <code>{row.youtube_id}</code>
                </li>
              ))}
            </ul>
          </section>

          {written.map((row, index) =>
            /* A placeholder is eight identical lines of filler. Expanded, the
               eight of them made this page 3,885px tall — and taller still
               once textareas got a min-height. Collapsed, they are a list you
               can scan; real reviews stay open because those are the ones
               worth reading. */
            row.is_placeholder ? (
              <details className="admin-card admin-collapse" key={row.id}>
                <summary>
                  <span>Written review {index + 1}</span>
                  <span className="admin-pill" data-tone="warn">
                    Placeholder
                  </span>
                </summary>
                <ReviewForm row={row} />
              </details>
            ) : (
              <section className="admin-card" key={row.id}>
                <h2>
                  Written review {index + 1}
                  <span className="admin-pill" data-tone="success" style={{ marginLeft: "10px" }}>
                    Real
                  </span>
                </h2>
                <ReviewForm row={row} />
              </section>
            ),
          )}
        </>
      )}
    </>
  );
}
