import type { Metadata } from "next";
import { AdminState } from "@/components/admin/Table";
import { createClient } from "@/lib/supabase/server";
import { updateFaq } from "../content-actions";

export const metadata: Metadata = {
  title: "FAQs",
  robots: { index: false, follow: false },
};

export default async function FaqsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("faqs")
    .select("id, question, answer, published, sort_order")
    .order("sort_order", { ascending: true });

  return (
    <>
      <div className="admin-pagehead">
        <h1>FAQs</h1>
        <p>
          These drive both the FAQ section and the FAQPage structured data
          Google reads. Unpublishing one removes it from both at once — the
          markup is generated from this list, so the two can never disagree.
        </p>
      </div>

      {error ? (
        <section className="admin-card">
          <AdminState tone="error" title="Could not read FAQs.">
            {error.message}
          </AdminState>
        </section>
      ) : !data?.length ? (
        <section className="admin-card">
          <AdminState title="No FAQs." />
        </section>
      ) : (
        data.map((faq) => (
          <section className="admin-card" key={faq.id}>
            <form action={updateFaq} className="admin-form">
              <input type="hidden" name="id" value={faq.id} />

              <div className="admin-field">
                <label htmlFor={`q-${faq.id}`}>Question</label>
                <input id={`q-${faq.id}`} name="question" defaultValue={faq.question} />
              </div>

              <div className="admin-field">
                <label htmlFor={`a-${faq.id}`}>Answer</label>
                <textarea id={`a-${faq.id}`} name="answer" rows={5} defaultValue={faq.answer} />
              </div>

              <div className="admin-inline-form">
                <label className="admin-check">
                  <input type="checkbox" name="published" defaultChecked={faq.published} />
                  Published
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
