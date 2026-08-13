import type { Metadata } from "next";
import { AdminState } from "@/components/admin/Table";
import { createClient } from "@/lib/supabase/server";
import { updatePost } from "../content-actions";

export const metadata: Metadata = {
  title: "Posts",
  robots: { index: false, follow: false },
};

export default async function PostsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("posts")
    .select("id, slug, title, summary, body, status, is_draft, topic, reading_time")
    .order("sort_order", { ascending: true });

  return (
    <>
      <div className="admin-pagehead">
        <h1>Posts</h1>
        <p>
          <strong>Status</strong> is whether the URL resolves at all.{" "}
          <strong>Unfinished</strong> is whether the writing is done — an
          unfinished post keeps its URL, shows a DRAFT badge and carries a
          noindex. They are separate on purpose; conflating them once cost
          three live URLs.
        </p>
      </div>

      {error ? (
        <section className="admin-card">
          <AdminState tone="error" title="Could not read posts.">
            {error.message}
          </AdminState>
        </section>
      ) : !data?.length ? (
        <section className="admin-card">
          <AdminState title="No posts." />
        </section>
      ) : (
        data.map((post) => (
          <section className="admin-card" key={post.id}>
            <h2>
              /blog/{post.slug}
              <span className="admin-pill" data-tone={post.is_draft ? "warn" : "success"} style={{ marginLeft: "10px" }}>
                {post.is_draft ? "Unfinished" : "Finished"}
              </span>
            </h2>

            <form action={updatePost} className="admin-form">
              <input type="hidden" name="id" value={post.id} />

              <div className="admin-field">
                <label htmlFor={`title-${post.id}`}>Title</label>
                <input id={`title-${post.id}`} name="title" defaultValue={post.title} />
              </div>

              <div className="admin-field">
                <label htmlFor={`summary-${post.id}`}>Summary</label>
                <textarea
                  id={`summary-${post.id}`}
                  name="summary"
                  rows={2}
                  defaultValue={post.summary}
                />
              </div>

              <div className="admin-field">
                <label htmlFor={`body-${post.id}`}>
                  Body — leave a blank line between paragraphs
                </label>
                <textarea
                  id={`body-${post.id}`}
                  name="body"
                  rows={10}
                  defaultValue={post.body.join("\n\n")}
                  placeholder="Nothing written yet."
                />
              </div>

              <div className="admin-inline-form">
                <label htmlFor={`status-${post.id}`}>Status</label>
                <select
                  id={`status-${post.id}`}
                  name="status"
                  className="admin-select"
                  defaultValue={post.status}
                >
                  <option value="published">published — URL resolves</option>
                  <option value="draft">draft — URL 404s</option>
                </select>

                <label className="admin-check">
                  <input type="checkbox" name="is_draft" defaultChecked={post.is_draft} />
                  Writing unfinished
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
