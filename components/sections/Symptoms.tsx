import { symptoms } from "@/content/site";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function Symptoms() {
  return (
    <section className="section section--sunk" aria-labelledby="symptoms-title">
      <SectionHeading
        title={symptoms.title}
        titleId="symptoms-title"
      />

      <div className="grid4">
        {symptoms.items.map((item) => (
          <div
            key={item.title}
            className="card"
            style={{ padding: "24px 22px", gap: "12px" }}
          >
            <span
              style={{
                fontFamily: "var(--font-prose)",
                fontSize: "var(--text-label)",
                fontWeight: 700,
                letterSpacing: "0.12em",
                color: "var(--warn)",
              }}
            >
              {item.tag}
            </span>
            <span
              style={{
                fontFamily: "var(--font-prose)",
                fontSize: "var(--text-lead)",
                fontWeight: 700,
                letterSpacing: "-0.01em",
              }}
            >
              {item.title}
            </span>
            <span
              style={{
                fontSize: "var(--text-body)",
                lineHeight: 1.6,
                color: "var(--muted)",
                textWrap: "pretty",
              }}
            >
              {item.body}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
