import { services, type StreamLine } from "@/content/site";
import { SectionHeading } from "@/components/ui/SectionHeading";

const MARK: Record<StreamLine["mark"], string> = { ok: "✓", warn: "!", flow: "→" };

/**
 * The event stream inside a service card.
 *
 * A short window onto a list of mono lines that scrolls slowly: on hover where
 * there is a pointer to hover with, and once the card is on screen where there
 * is not. The list is rendered twice so the loop has no seam.
 *
 * Decoration. The card's own bullets say what the service includes, so this is
 * hidden from screen readers rather than read out as five lines of jargon,
 * twice. Under reduced motion it does not move and simply shows its first
 * three lines.
 */
function EventStream({ lines }: { lines: StreamLine[] }) {
  return (
    <div className="svc-stream" aria-hidden="true" data-inview="pending">
      <ul className="svc-stream__track">
        {[...lines, ...lines].map((line, i) => (
          <li key={i} className="svc-stream__line" data-mark={line.mark}>
            <span className="svc-stream__mark">{MARK[line.mark]}</span>
            {line.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Services() {
  return (
    <section id="services" className="section section--raised" aria-labelledby="services-title">
      <SectionHeading eyebrow={services.eyebrow} title={services.title} titleId="services-title" />

      <div className="grid4 svc-grid">
        {services.items.map((item) => (
          <article key={item.code} className="card service-card">
            <div className="svc-meta">
              <span>{item.code}</span>
              <span>{item.duration}</span>
            </div>

            <h3 className="svc-title">{item.title}</h3>
            <p className="svc-price">{item.price}</p>
            <p className="svc-body">{item.body}</p>

            <EventStream lines={item.stream} />

            <ul className="svc-bullets">
              {item.bullets.map((bullet) => (
                <li key={bullet}>
                  <span aria-hidden="true">+</span> {bullet}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <p className="svc-footnote">{services.footnote}</p>
    </section>
  );
}
