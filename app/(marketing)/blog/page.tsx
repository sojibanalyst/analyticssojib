import type { Metadata } from "next";
import Link from "next/link";
import { blog, posts, publishedPosts } from "@/content/posts";
import { site } from "@/content/site";
import { SectionHeading } from "@/components/ui/SectionHeading";

const url = `${site.url}/blog`;

export const metadata: Metadata = {
  title: "Writing",
  description:
    "Notes on GA4, Google Tag Manager, server-side tagging, Meta CAPI and Consent Mode v2 — written from the reconciliation work, not from a keyword list.",
  alternates: { canonical: url },
  openGraph: {
    type: "website",
    url,
    title: `Writing — ${site.name}`,
    description:
      "Notes on GA4, Google Tag Manager, server-side tagging, Meta CAPI and Consent Mode v2.",
  },
  // Nothing is published yet, so the index has no content to offer a crawler.
  // This flips itself once the first post ships.
  robots: publishedPosts.length === 0 ? { index: false, follow: true } : undefined,
};

export default function BlogIndex() {
  return (
    <main id="main">
      <section className="section" aria-labelledby="blog-index-title">
        <SectionHeading
          eyebrow={blog.eyebrow}
          title={blog.title}
          titleId="blog-index-title"
        />

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
                  fontSize: "14px",
                  lineHeight: 1.6,
                  color: "var(--muted)",
                  textWrap: "pretty",
                }}
              >
                {post.summary}
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

        <Link href="/" className="btn btn-ghost" style={{ alignSelf: "flex-start" }}>
          ← BACK TO THE SITE
        </Link>
      </section>
    </main>
  );
}
