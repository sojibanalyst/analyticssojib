import { services } from "@/content/site";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function Services() {
  return (
    <section
      id="services"
      className="section section--surface"
      aria-labelledby="services-title"
    >
      <SectionHeading
        eyebrow={services.eyebrow}
        title={services.title}
        titleId="services-title"
      />

      <div className="grid4" style={{ gap: "16px" }}>
        {services.items.map((item) => (
          <div
            key={item.code}
            className="card service-card"
            style={{ padding: "24px 22px", gap: "14px" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: "12px",
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                letterSpacing: "0.1em",
                whiteSpace: "nowrap",
                color: "var(--muted)",
              }}
            >
              <span>{item.code}</span>
              <span style={{ marginLeft: "auto" }}>{item.duration}</span>
            </div>

            <h3
              style={{
                margin: 0,
                fontFamily: "var(--font-sans)",
                fontSize: "20px",
                fontWeight: 700,
                letterSpacing: "-0.015em",
                textTransform: "uppercase",
              }}
            >
              {item.title}
            </h3>

            <p
              style={{
                margin: 0,
                fontSize: "14.5px",
                lineHeight: 1.6,
                color: "var(--muted)",
                textWrap: "pretty",
              }}
            >
              {item.body}
            </p>

            <ul
              style={{
                listStyle: "none",
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                color: "var(--muted)",
                borderTop: "1px solid var(--border)",
                padding: "14px 0 0",
                marginTop: "auto",
              }}
            >
              {item.bullets.map((bullet) => (
                <li key={bullet}>
                  <span style={{ color: "var(--ok)" }} aria-hidden="true">
                    +
                  </span>{" "}
                  {bullet}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-mono)",
          fontSize: "11.5px",
          letterSpacing: "0.06em",
          color: "var(--faint)",
        }}
      >
        {services.footnote}
      </p>
    </section>
  );
}
