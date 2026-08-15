import { about } from "@/content/site";

const docStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "10px",
  alignSelf: "flex-start",
  boxSizing: "border-box",
  border: "1px solid var(--border)",
  borderRadius: "10px",
  padding: "14px 16px",
  fontFamily: "var(--font-prose)",
  fontSize: "12px",
  letterSpacing: "0.06em",
  color: "var(--text)",
};

/**
 * Renders as a real link once the doc exists. Until Sojib publishes it the
 * same control renders as plain text marked "(LINK COMING)" — the design keeps
 * its shape without shipping a link that goes nowhere.
 */
function DocButton() {
  const { label, note, pendingNote, url } = about.doc;

  if (!url) {
    return (
      <span style={{ ...docStyle, color: "var(--muted)" }}>
        <span aria-hidden="true" style={{ color: "var(--ink)" }}>
          ▤
        </span>
        {label}
        <span style={{ color: "var(--faint)" }}>{pendingNote}</span>
      </span>
    );
  }

  // Internal routes stay in the tab; an external doc opens in a new one.
  const external = /^https?:/.test(url);

  return (
    <a
      href={url}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener" : undefined}
      className="doc-button"
      style={docStyle}
    >
      <span aria-hidden="true" style={{ color: "var(--ink)" }}>
        ▤
      </span>
      {label}
      <span style={{ color: "var(--muted)" }}>{note}</span>
    </a>
  );
}

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
            fontFamily: "var(--font-prose)",
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
        <DocButton />

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
            fontFamily: "var(--font-prose)",
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
