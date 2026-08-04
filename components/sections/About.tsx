import { about } from "@/content/site";

export function About() {
  return (
    <section
      id="about"
      aria-labelledby="about-title"
      style={{
        paddingBlock: "56px",
        paddingInline: "max(clamp(18px, 4vw, 48px), calc((100% - 1280px) / 2))",
        borderBottom: "1px solid var(--border)",
        background: "var(--surface)",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: "34px",
        alignItems: "start",
      }}
    >
      <div
        style={{
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <span className="eyebrow">{about.eyebrow}</span>
        <h2
          id="about-title"
          style={{
            margin: 0,
            fontFamily: "var(--font-sans)",
            fontSize: "clamp(24px, 3.6vw, 30px)",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            textTransform: "uppercase",
            textWrap: "balance",
          }}
        >
          {about.title}
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: "16px",
            lineHeight: 1.7,
            color: "var(--muted)",
            textWrap: "pretty",
          }}
        >
          {about.body}
        </p>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {about.chips.map((chip) => (
            <span key={chip} className="pill">
              {chip}
            </span>
          ))}
        </div>
      </div>

      {/* The design put a client pull-quote here. None was supplied, so this is
          Sojib's own positioning statement rather than an invented testimonial. */}
      <div
        style={{
          minWidth: 0,
          borderLeft: "2px solid var(--accent)",
          padding: "4px 0 4px 22px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "clamp(18px, 2.2vw, 21px)",
            lineHeight: 1.5,
            fontWeight: 500,
            letterSpacing: "-0.01em",
            textWrap: "pretty",
          }}
        >
          {about.pullquote}
        </p>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            letterSpacing: "0.08em",
            color: "var(--muted)",
          }}
        >
          {about.pullquoteAttribution}
        </span>
      </div>
    </section>
  );
}
