import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { site, work } from "@/content/site";
import { Header } from "@/components/Header";
import { Footer } from "@/components/sections/Footer";

type Params = { params: Promise<{ slug: string }> };

const getCase = (slug: string) => work.cases.find((c) => c.slug === slug);

export function generateStaticParams() {
  return work.cases.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const item = getCase(slug);
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
  const item = getCase(slug);
  if (!item) notFound();

  return (
    <>
      <a href="#main" className="skip-link">
        SKIP TO CONTENT
      </a>
      <Header />
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
              fontFamily: "var(--font-sans)",
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

          <div className="grid4">
            {item.stats.map((stat) => (
              <div key={stat.label} className="stat-tile">
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "20px", fontWeight: 800 }}>
                  {stat.value}
                  {stat.unit && (
                    <span style={{ fontSize: "12px", color: "var(--muted)" }}>{stat.unit}</span>
                  )}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
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
              <h2
                style={{
                  margin: 0,
                  fontFamily: "var(--font-sans)",
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
            </section>
          ))}

          <p
            style={{
              margin: 0,
              maxWidth: "72ch",
              fontFamily: "var(--font-mono)",
              fontSize: "11.5px",
              lineHeight: 1.6,
              letterSpacing: "0.04em",
              color: "var(--faint)",
            }}
          >
            {work.metricNote}
          </p>

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
      <Footer />
    </>
  );
}
