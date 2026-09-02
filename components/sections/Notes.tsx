import Link from "next/link";
import { blog, type Post } from "@/content/posts";
import { SectionHeading } from "@/components/ui/SectionHeading";

/**
 * The WRITING section, and the decision about when it exists at all.
 *
 * It renders FINISHED posts only, and renders nothing — no heading, no empty
 * state, no anchor — when there are none. Four reasons, in order of weight:
 *
 *  1. The section's only job is proof. Three cards all badged DRAFT are proof
 *     of the opposite, to exactly the prospect it was built to convince.
 *  2. Hiding it costs no traffic. An unfinished post already carries a
 *     noindex, so it was never going to rank; not linking it from the homepage
 *     gives up nothing a crawler was allowed to use.
 *  3. The URLs still work. An unfinished post keeps its address and its
 *     noindex, so anything already shared still resolves — it simply is not
 *     advertised.
 *  4. It heals itself. Clear "unfinished" on one post in the console and the
 *     section returns, carrying that post. No new flag, no deploy.
 *
 * An empty state was the obvious alternative and is worse: "nothing published
 * yet" is the same admission with a heading on top.
 */
export function Notes({ posts }: { posts: Post[] }) {
  const finished = posts.filter((post) => !post.draft);
  if (finished.length === 0) return null;

  return (
    <section id="blog" className="section section--sunk" aria-labelledby="blog-title">
      <SectionHeading eyebrow={blog.eyebrow} title={blog.title} titleId="blog-title" />

      <div
        data-stagger
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "12px",
        }}
      >
        {finished.map((post) => (
          <Link key={post.slug} href={`/blog/${post.slug}`} className="note-card">
            <span
              style={{
                fontFamily: "var(--font-prose)",
                fontSize: "var(--text-label)",
                letterSpacing: "0.1em",
                color: "var(--muted)",
              }}
            >
              {/* No DRAFT badge: an unfinished post never reaches this list. */}
              {post.topic} · {post.readingTime}
            </span>

            <span
              style={{
                fontFamily: "var(--font-prose)",
                fontSize: "var(--text-lead)",
                fontWeight: 700,
                letterSpacing: "-0.01em",
                lineHeight: 1.35,
                color: "var(--text)",
                textWrap: "pretty",
              }}
            >
              {post.title}
            </span>

            <span
              style={{
                fontFamily: "var(--font-prose)",
                fontSize: "var(--text-label)",
                letterSpacing: "0.1em",
                color: "var(--ink)",
                marginTop: "auto",
              }}
            >
              READ →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
