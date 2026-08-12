import { faq, type Faq as FaqItem } from "@/content/site";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { faqJsonLd, ldJson } from "@/lib/jsonld";

/**
 * The design has no FAQ section, so this is built from its own vocabulary:
 * the section shell, the eyebrow + h2 pair, and the card's surface/border/14px
 * radius. <details>/<summary> keeps it keyboard-operable with no JavaScript.
 */
export function Faq({ items }: { items: FaqItem[] }) {
  return (
    <section
      id="faq"
      className="section section--surface"
      aria-labelledby="faq-title"
    >
      <SectionHeading eyebrow={faq.eyebrow} title={faq.title} titleId="faq-title" />

      <div>
        {items.map((item) => (
          <details key={item.q} className="faq-item">
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldJson(faqJsonLd(items)) }}
      />
    </section>
  );
}
