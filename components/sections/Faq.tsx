import { faq, type Faq as FaqItem } from "@/content/site";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { faqJsonLd, ldJson } from "@/lib/jsonld";

/**
 * The design has no FAQ section, so this is built from its own vocabulary:
 * the section shell, the eyebrow + h2 pair, and the card's surface/border/14px
 * radius. <details>/<summary> keeps it keyboard-operable with no JavaScript.
 */
export function Faq({
  items,
  limit,
  moreHref,
  structuredData = true,
}: {
  items: FaqItem[];
  /** Show only the first few, as on the homepage. */
  limit?: number;
  /** Where the full list is, when only some are shown. */
  moreHref?: string;
  /** FAQPage JSON-LD belongs on the page with the full list only. */
  structuredData?: boolean;
}) {
  const shown = limit ? items.slice(0, limit) : items;
  return (
    <section
      id="faq"
      className="section"
      aria-labelledby="faq-title"
    >
      <SectionHeading title={faq.title} titleId="faq-title" />

      <div data-stagger>
        {shown.map((item) => (
          <details key={item.q} className="faq-item">
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>

      {moreHref && shown.length < items.length ? (
        <div className="teaser__foot">
          <a href={moreHref} className="btn btn-ghost">
            All questions →
          </a>
        </div>
      ) : null}

      {structuredData ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: ldJson(faqJsonLd(items)) }}
        />
      ) : null}
    </section>
  );
}
