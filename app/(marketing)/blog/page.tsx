import type { Metadata } from "next";
import Link from "next/link";
import { blog } from "@/content/posts";
import { site } from "@/content/site";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getPublishedPosts } from "@/lib/content";

const url = `${site.url}/blog`;

export const revalidate = 3600;

// generateMetadata rather than a constant, because whether this page is
// indexable depends on how many posts are published — which now comes from
// the database. The output is identical.
export async function generateMetadata(): Promise<Metadata> {
  const published = await getPublishedPosts();

  return {
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
    // Nothing is published yet, so the index has no content to offer a
    // crawler. This flips itself once the first post ships.
    robots: published.length === 0 ? { index: false, follow: true } : undefined,
  };
}

export default async function BlogIndex() {
  // Finished posts only, matching the homepage section. A visitor who clicks
  // through from a section listing two posts should not land on a page listing
  // five, three of them badged DRAFT — and an unfinished post is noindexed, so
  // listing it here earns nothing either.
  const posts = await getPublishedPosts();

  return (
    <main id="main">
      <section className="section" aria-labelledby="blog-index-title">
        <SectionHeading
          eyebrow={blog.eyebrow}
          title={blog.title}
          titleId="blog-index-title"
        />

        {/* This page is reachable directly and from the foot of every post, so
            unlike the homepage section it cannot render nothing — a heading
            above a void reads as a bug. It says the true thing instead, and is
            already noindexed while it is in this state. */}
        {posts.length === 0 ? (
          <p
            style={{
              margin: 0,
              maxWidth: "52ch",
              fontSize: "16px",
              lineHeight: 1.65,
              color: "var(--muted)",
            }}
          >
            Nothing finished yet. What is in progress is not listed here until
            it is worth your time. There is enough half-written analytics
            writing on the internet already.
          </p>
        ) : null}

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
                  fontFamily: "var(--font-prose)",
                  fontSize: "11px",
                  letterSpacing: "0.1em",
                  color: "var(--muted)",
                }}
              >
                {post.topic} · {post.readingTime}
              </span>

              <span
                style={{
                  fontFamily: "var(--font-prose)",
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
                  fontFamily: "var(--font-prose)",
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
