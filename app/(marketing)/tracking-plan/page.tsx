import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/content/site";
import {
  planSections,
  readingTimeMinutes,
  trackingPlanMeta as meta,
} from "@/content/tracking-plan";
import { PlanNav } from "@/components/tracking-plan/PlanNav";
import { BlockRenderer, Rich } from "@/components/tracking-plan/Blocks";
import { PrintButton } from "@/components/tracking-plan/PrintButton";
import { CalendlyPopupButton } from "@/components/CalendlyPopupButton";
import { ldJson } from "@/lib/jsonld";

const url = `${site.url}/tracking-plan`;

export const metadata: Metadata = {
  // `absolute` bypasses the layout's "%s — Sojib H." template: this title
  // already ends in "| Sojib H." and would otherwise be suffixed twice.
  title: { absolute: meta.title },
  description: meta.description,
  alternates: { canonical: url },
  openGraph: {
    type: "article",
    url,
    title: meta.title,
    description: meta.description,
  },
  twitter: {
    card: "summary_large_image",
    title: meta.title,
    description: meta.description,
  },
};

const techArticleJsonLd = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "@id": `${url}/#article`,
  headline: "The plan comes before the tag",
  name: meta.title,
  description: meta.description,
  url,
  inLanguage: "en",
  isAccessibleForFree: true,
  author: { "@id": `${site.url}/#person` },
  publisher: { "@id": `${site.url}/#person` },
  about: [
    "Google Analytics 4",
    "Google Tag Manager",
    "Server-side tagging",
    "Meta Conversions API",
    "Google Ads enhanced conversions",
    "Consent Mode v2",
  ],
  articleSection: planSections.map((s) => `${s.num} / ${s.kicker}`),
  mainEntityOfPage: { "@type": "WebPage", "@id": url },
};

export default function TrackingPlanPage() {
  return (
    <>
      <main id="main" className="plan-page">
        <header className="plan-header">
          <span className="eyebrow">{meta.eyebrow}</span>

          <h1 className="plan-h1">{meta.h1}</h1>

          {meta.standfirst.map((para, i) => (
            <p key={i} className="plan-standfirst">
              <Rich text={para} />
            </p>
          ))}

          <div className="plan-meta-row">
            <span className="plan-meta-row__stack">{meta.stack}</span>
            <span className="plan-meta-row__sep" aria-hidden="true">
              ·
            </span>
            <span>{readingTimeMinutes} MIN READ</span>
            <PrintButton label={meta.downloadLabel} />
          </div>
        </header>

        <div className="plan-body">
          <PlanNav />

          <div className="plan-doc">
            {planSections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                aria-labelledby={`${section.id}-title`}
                className="plan-section"
              >
                <div className="section-head">
                  <span className="eyebrow">
                    {section.num} / {section.kicker}
                  </span>
                  <h2 id={`${section.id}-title`} className="h2 plan-h2">
                    {section.title}
                  </h2>
                </div>

                {section.blocks.map((block, i) => (
                  <BlockRenderer key={i} block={block} />
                ))}
              </section>
            ))}

            <section className="plan-closing" aria-labelledby="plan-closing-title">
              <h2 id="plan-closing-title" className="h2">
                {meta.closing.heading}
              </h2>
              <p className="plan-lead">{meta.closing.body}</p>
              <p className="plan-cta-note">{meta.closing.ctaNote}</p>
              <div className="plan-cta plan-cta--end">
                <CalendlyPopupButton
                  className="btn btn-primary"
                  placement="tracking-plan-end"
                >
                  BOOK A 30-MIN CALL
                </CalendlyPopupButton>
                <Link href={meta.closing.secondaryHref} className="btn btn-ghost">
                  {meta.closing.secondary}
                </Link>
              </div>
            </section>
          </div>
        </div>
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldJson(techArticleJsonLd) }}
      />
    </>
  );
}
