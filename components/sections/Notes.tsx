import Link from "next/link";
import { blog, posts } from "@/content/posts";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function Notes() {
  return (
    <section id="blog" className="section" aria-labelledby="blog-title">
      <SectionHeading eyebrow={blog.eyebrow} title={blog.title} titleId="blog-title" />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "12px",
        }}
      >
        {posts.map((post) => (
          <Link key={post.slug} href={`/blog/${post.slug}`} className="note-card">
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                letterSpacing: "0.1em",
                color: "var(--muted)",
              }}
            >
              {post.topic} · {post.readingTime}
              {post.draft && <span style={{ color: "var(--faint)" }}> · DRAFT</span>}
            </span>

            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "16.5px",
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
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
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
