import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { blog } from "@/content/posts";
import { site } from "@/content/site";
import { getPost, getPosts } from "@/lib/content";

type Params = { params: Promise<{ slug: string }> };

export const revalidate = 3600;

// Every post, draft included — drafts have always rendered at their URL and
// carried a noindex, and that stays true. Changing it would remove a URL.
export async function generateStaticParams() {
  return (await getPosts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Post not found" };

  const url = `${site.url}/blog/${post.slug}`;
  return {
    title: post.title,
    description: post.summary,
    alternates: { canonical: url },
    // Drafts stay out of the index until they are actually written.
    robots: post.draft ? { index: false, follow: true } : undefined,
    openGraph: {
      type: "article",
      url,
      title: post.title,
      description: post.summary,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.summary,
    },
  };
}

export default async function BlogPost({ params }: Params) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  return (
    <>
      <main id="main">
        <article
          className="section"
          style={{ minHeight: "60svh" }}
          aria-labelledby="post-title"
        >
          <div className="section-head">
            <span className="eyebrow">
              {post.topic} · {post.readingTime}
            </span>
            {post.draft && <span className="eyebrow eyebrow--muted">DRAFT</span>}
          </div>

          <h1
            id="post-title"
            style={{
              margin: 0,
              maxWidth: "22ch",
              fontFamily: "var(--font-prose)",
              fontSize: "clamp(28px, 5.2vw, 46px)",
              lineHeight: 1.1,
              fontWeight: 700,
              letterSpacing: "-0.025em",
              textTransform: "uppercase",
              textWrap: "balance",
            }}
          >
            {post.title}
          </h1>

          <p
            style={{
              margin: 0,
              maxWidth: "62ch",
              fontSize: "clamp(17px, 2vw, 21px)",
              lineHeight: 1.5,
              color: "var(--muted)",
              textWrap: "pretty",
            }}
          >
            {post.summary}
          </p>

          {post.body.length > 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "18px",
                maxWidth: "70ch",
              }}
            >
              {post.body.map((para, i) => (
                <p
                  key={i}
                  style={{
                    margin: 0,
                    fontSize: "16px",
                    lineHeight: 1.7,
                    color: "var(--muted)",
                    textWrap: "pretty",
                  }}
                >
                  {para}
                </p>
              ))}
            </div>
          ) : (
            <p
              style={{
                margin: 0,
                maxWidth: "62ch",
                borderLeft: "2px solid var(--accent)",
                padding: "4px 0 4px 22px",
                fontSize: "15px",
                lineHeight: 1.7,
                color: "var(--faint)",
                textWrap: "pretty",
              }}
            >
              {blog.draftNotice}
            </p>
          )}

          <Link href="/blog" className="btn btn-ghost" style={{ alignSelf: "flex-start" }}>
            ← ALL NOTES
          </Link>
        </article>
      </main>
    </>
  );
}
