import type { Metadata } from "next";
import { AdminState } from "@/components/admin/Table";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { SavingForm } from "@/components/admin/SavingForm";
import { createClient } from "@/lib/supabase/server";
import {
  createPortfolioItem,
  deletePortfolioItem,
  updatePortfolioItem,
} from "../content-actions";

export const metadata: Metadata = {
  title: "Portfolio",
  robots: { index: false, follow: false },
};

/**
 * The portfolio: the projects under the case files on the homepage, and their
 * pages at /work/<slug>.
 *
 * One collapsed row per project, because there are fifty of them and a page of
 * fifty open forms is a page nobody can find anything on. The summary carries
 * what you need to pick the right one: its order, its title, and whether it is
 * featured or hidden.
 *
 * Images are not edited here. They are files in the repository, written by
 * `npm run portfolio:images`, which also prints the SQL that records them.
 */
export default async function PortfolioPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("portfolio_items")
    .select(
      "id, slug, title, role, description, skills, client, video_id, featured, published, sort_order, url, images",
    )
    .order("sort_order", { ascending: true });

  return (
    <>
      <div className="admin-pagehead">
        <h1>Portfolio</h1>
        <p>
          The projects shown under the case files, each with its own page at{" "}
          <code>/work/&lt;slug&gt;</code>. Featured projects get the larger card and come first.
          Lower order numbers come earlier. Hiding a project removes its card and its page.
        </p>
      </div>

      <section className="admin-card">
        <h2>Add a project</h2>
        <SavingForm action={createPortfolioItem} submitLabel="Add">
          <div className="admin-field">
            <label htmlFor="new-pf-title">Title</label>
            <input id="new-pf-title" name="title" required />
          </div>
          <div className="admin-field">
            <label htmlFor="new-pf-description">Description</label>
            <textarea id="new-pf-description" name="description" rows={4} required />
          </div>
          <div className="admin-field">
            <label htmlFor="new-pf-skills">Skills, comma separated</label>
            <input id="new-pf-skills" name="skills" />
          </div>
          <p className="admin-reason">
            Created hidden. Open it below to add the rest, then tick Published.
          </p>
        </SavingForm>
      </section>

      {error ? (
        <section className="admin-card">
          <AdminState tone="error" title="Could not read the portfolio.">
            {error.message}
          </AdminState>
        </section>
      ) : !data?.length ? (
        <section className="admin-card">
          <AdminState title="No projects." />
        </section>
      ) : (
        data.map((item) => {
          const imageCount = Array.isArray(item.images) ? item.images.length : 0;
          return (
            <details className="admin-card admin-collapse" key={item.id}>
              <summary>
                <span className="admin-mono">{item.sort_order}</span> {item.title}
                {item.featured ? " · featured" : ""}
                {item.published ? "" : " · hidden"}
              </summary>

              <SavingForm action={updatePortfolioItem}>
                <input type="hidden" name="id" value={item.id} />

                <div className="admin-field">
                  <label htmlFor={`pf-title-${item.id}`}>Title</label>
                  <input id={`pf-title-${item.id}`} name="title" defaultValue={item.title} required />
                </div>

                <div className="admin-field">
                  <label htmlFor={`pf-role-${item.id}`}>Role (optional)</label>
                  <input id={`pf-role-${item.id}`} name="role" defaultValue={item.role ?? ""} />
                </div>

                <div className="admin-field">
                  <label htmlFor={`pf-desc-${item.id}`}>Description</label>
                  <textarea
                    id={`pf-desc-${item.id}`}
                    name="description"
                    rows={6}
                    defaultValue={item.description}
                    required
                  />
                </div>

                <div className="admin-field">
                  <label htmlFor={`pf-skills-${item.id}`}>Skills, comma separated</label>
                  <input
                    id={`pf-skills-${item.id}`}
                    name="skills"
                    defaultValue={item.skills.join(", ")}
                  />
                </div>

                <div className="admin-field">
                  <label htmlFor={`pf-client-${item.id}`}>
                    Client (optional, only if they agreed to be named)
                  </label>
                  <input id={`pf-client-${item.id}`} name="client" defaultValue={item.client ?? ""} />
                </div>

                <div className="admin-field">
                  <label htmlFor={`pf-video-${item.id}`}>YouTube video id (optional)</label>
                  <input
                    id={`pf-video-${item.id}`}
                    name="video_id"
                    className="admin-mono"
                    defaultValue={item.video_id ?? ""}
                  />
                </div>

                <div className="admin-field">
                  <label htmlFor={`pf-url-${item.id}`}>Link on Upwork</label>
                  <input
                    id={`pf-url-${item.id}`}
                    name="url"
                    type="url"
                    className="admin-mono"
                    defaultValue={item.url}
                    required
                  />
                </div>

                <div className="admin-field">
                  <label htmlFor={`pf-order-${item.id}`}>Order</label>
                  <input
                    id={`pf-order-${item.id}`}
                    name="sort_order"
                    type="number"
                    className="admin-mono"
                    defaultValue={item.sort_order}
                  />
                </div>

                <label className="admin-check">
                  <input type="checkbox" name="featured" defaultChecked={item.featured} />
                  Featured
                </label>
                <label className="admin-check">
                  <input type="checkbox" name="published" defaultChecked={item.published} />
                  Published
                </label>

                <p className="admin-reason">
                  Page: <code>/work/{item.slug}</code> · {imageCount} image
                  {imageCount === 1 ? "" : "s"}
                </p>
              </SavingForm>

              <DeleteButton action={deletePortfolioItem} id={item.id} label="Delete project" />
            </details>
          );
        })
      )}
    </>
  );
}
