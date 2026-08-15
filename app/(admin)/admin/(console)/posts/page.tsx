import type { Metadata } from "next";
import { AdminState } from "@/components/admin/Table";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { SavingForm } from "@/components/admin/SavingForm";
import { createClient } from "@/lib/supabase/server";
import { createPost, deletePost, updatePost } from "../content-actions";

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

      <section className="admin-card">
        <h2>Write a new post</h2>
        <SavingForm action={createPost} submitLabel="Create">
          <div className="admin-field">
            <label htmlFor="new-title">Title</label>
            <input id="new-title" name="title" required placeholder="What the post is about" />
          </div>

          <div className="admin-field">
            <label htmlFor="new-summary">
              Summary — one sentence, used on the card and in search results
            </label>
            <textarea id="new-summary" name="summary" rows={2} />
          </div>

          {/* .admin-grid, not a new class — it already does auto-fit columns
              with a 180px minimum, which is exactly two side by side here and
              one apiece on a phone. These two were the only lowercase inline
              labels left in the console; everything else is .admin-field. */}
          <div className="admin-grid">
            <div className="admin-field">
              <label htmlFor="new-topic">Kicker</label>
              <input id="new-topic" name="topic" placeholder="SERVER-SIDE" />
            </div>

            <div className="admin-field">
              <label htmlFor="new-reading">Reading time</label>
              <input id="new-reading" name="reading_time" placeholder="9 MIN" />
            </div>
          </div>

          <p className="admin-note">
            The URL is made from the title and never changes afterwards. A new
            post starts live but marked unfinished, so the page works while you
            write and stays out of Google until you untick it.
          </p>
        </SavingForm>
      </section>

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
              {/* The heading is the post's URL, so it is a path, not a title. */}
              <span className="admin-mono">/blog/{post.slug}</span>
              <span
                className="admin-pill"
                data-tone={post.is_draft ? "warn" : "success"}
                style={{ marginLeft: "10px" }}
              >
                {post.is_draft ? "Unfinished" : "Finished"}
              </span>
            </h2>

            <SavingForm action={updatePost}>
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
              </div>
            </SavingForm>

            <DeleteButton action={deletePost} id={post.id} label="Delete post" />
          </section>
        ))
      )}
    </>
  );
}
