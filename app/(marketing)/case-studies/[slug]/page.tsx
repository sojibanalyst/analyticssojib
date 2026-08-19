import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { site, work } from "@/content/site";
import { BeforeAfter } from "@/components/sections/BeforeAfter";
import { canClaimReconciliation, hasMetric } from "@/lib/case-study";
import { getCaseStudies, getCaseStudy } from "@/lib/content";

type Params = { params: Promise<{ slug: string }> };

export const revalidate = 3600;

export async function generateStaticParams() {
  return (await getCaseStudies()).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const item = await getCaseStudy(slug);
  if (!item) return { title: "Case study not found" };

  const url = `${site.url}/case-studies/${item.slug}`;
  return {
    title: item.title,
    description: item.detail.intro,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: item.title,
      description: item.detail.intro,
    },
    twitter: {
      card: "summary_large_image",
      title: item.title,
      description: item.detail.intro,
    },
  };
}

export default async function CaseStudyPage({ params }: Params) {
  const { slug } = await params;
  const item = await getCaseStudy(slug);
  if (!item) notFound();

  return (
    <>
      <main id="main">
        <article className="section" aria-labelledby="case-title">
          <div className="section-head">
            <span className="eyebrow">{item.code}</span>
            <span className="status-pill">
              <span className="status-dot" aria-hidden="true" />
              {item.status}
            </span>
          </div>

          <h1
            id="case-title"
            style={{
              margin: 0,
              maxWidth: "24ch",
              fontFamily: "var(--font-prose)",
              fontSize: "clamp(28px, 5.2vw, 46px)",
              lineHeight: 1.1,
              fontWeight: 700,
              letterSpacing: "-0.025em",
              textTransform: "uppercase",
              textWrap: "balance",
            }}
          >
            {item.title}
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
            {item.detail.intro}
          </p>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {item.tags.map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
          </div>

          {/*
            The headline figure, which used to appear on the homepage card and
            nowhere else — so anyone arriving from a search result or a shared
            link read the whole case without ever seeing the number it is
            about. Same component as the card, so the two cannot drift.
          */}
          {hasMetric(item.metric) ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "70ch" }}>
              <BeforeAfter metric={item.metric} />
            </div>
          ) : null}

          <div className="grid4">
            {item.stats.map((stat) => (
              <div key={stat.label} className="stat-tile">
                <span style={{ fontFamily: "var(--font-prose)", fontSize: "20px", fontWeight: 800 }}>
                  {stat.value}
                  {stat.unit && (
                    <span style={{ fontSize: "12px", color: "var(--muted)" }}>{stat.unit}</span>
                  )}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-prose)",
                    fontSize: "11px",
                    letterSpacing: "0.08em",
                    color: "var(--muted)",
                  }}
                >
                  {stat.label}
                </span>
              </div>
            ))}
          </div>

          {item.detail.sections.map((sec) => (
            <section
              key={sec.heading}
              style={{ display: "flex", flexDirection: "column", gap: "14px", maxWidth: "70ch" }}
            >
              {/* Screenshots are placed under the section they prove, so the
                  evidence sits next to the claim rather than in a lump. */}
              <h2
                style={{
                  margin: 0,
                  fontFamily: "var(--font-prose)",
                  fontSize: "clamp(21px, 2.4vw, 24px)",
                  fontWeight: 700,
                  letterSpacing: "-0.015em",
                }}
              >
                {sec.heading}
              </h2>
              {sec.paras.map((para, i) => (
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

              {item.screenshots
                .filter((shot) => shot.section === sec.heading)
                .map((shot) => (
                  <figure key={shot.src} className="case-figure">
                    <div className="case-shot">
                      <Image
                        src={shot.src}
                        alt={shot.alt}
                        fill
                        sizes="(max-width: 1279px) 100vw, 900px"
                        style={{ objectFit: "cover" }}
                      />
                    </div>
                    <figcaption className="case-gallery__caption">
                      {shot.caption}
                    </figcaption>
                  </figure>
                ))}
            </section>
          ))}

          {/*
            "Every figure above was reconciled against the client's own order
            data before sign-off." That is a claim, not decoration, and it was
            printed unconditionally — including on a case study with no figures
            above it at all, and on the one the console flags as "my
            construction rather than fact". Either of those makes it false, so
            it now renders only when both are answered. When it cannot be said,
            nothing is said.
          */}
          {canClaimReconciliation(item) ? (
            <p
              style={{
                margin: 0,
                maxWidth: "72ch",
                fontFamily: "var(--font-prose)",
                fontSize: "11.5px",
                lineHeight: 1.6,
                letterSpacing: "0.04em",
                color: "var(--faint)",
              }}
            >
              {work.metricNote}
            </p>
          ) : null}

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <Link href="/tracking-plan" className="btn btn-primary">
              READ THE PLAN BEHIND THIS WORK →
            </Link>
            <Link href="/#work" className="btn btn-ghost">
              ← ALL CASE FILES
            </Link>
          </div>
        </article>
      </main>
    </>
  );
}
