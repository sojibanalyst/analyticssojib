import { process } from "@/content/site";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function Process() {
  return (
    <section id="process" className="section" aria-labelledby="process-title">
      <SectionHeading
        eyebrow={process.eyebrow}
        title={process.title}
        titleId="process-title"
      />

      <ol
        className="grid4"
        style={{ listStyle: "none", margin: 0, padding: 0 }}
      >
        {process.steps.map((step) => (
          <li
            key={step.step}
            className="card"
            style={{ padding: "22px 20px", gap: "10px" }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "28px",
                fontWeight: 800,
                color: "var(--ink)",
                letterSpacing: "-0.03em",
              }}
            >
              {step.step}
            </span>
            <h3
              style={{
                margin: 0,
                fontFamily: "var(--font-mono)",
                fontSize: "15px",
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {step.title}
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: "14px",
                lineHeight: 1.6,
                color: "var(--muted)",
              }}
            >
              {step.body}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
