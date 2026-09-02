import { process } from "@/content/site";

/**
 * The section with no heading. It opens on 01 AUDIT and simply runs.
 *
 * One of three deliberate breaks in the page's template — every section had
 * the same shape, eyebrow then heading then subtitle then grid, eleven times
 * over, and a page where every chapter is built to the same jig reads as
 * generated because it was. Four numbered steps do not need to be told they
 * are a method; a person writing this section would have looked at
 * "05 / METHOD — HOW THE WORK RUNS" sitting above "01 AUDIT" and deleted it.
 *
 * The name is not lost, only unprinted: aria-label carries process.title, so
 * a screen reader still announces the section and the landmark list is intact.
 * Breaking a visual template is not a licence to break the semantics under it.
 */
export function Process() {
  return (
    <section id="process" className="section section--sunk" aria-label={process.title}>
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
                fontFamily: "var(--font-prose)",
                fontSize: "var(--text-h3)",
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
                fontFamily: "var(--font-prose)",
                fontSize: "var(--text-body)",
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
                fontSize: "var(--text-small)",
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
