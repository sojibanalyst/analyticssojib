import type { ReactNode } from "react";

/**
 * The shell shared by /privacy and /terms.
 *
 * Both are reference documents rather than marketing sections: left-aligned on
 * a narrow measure, headings not centred. Extracted the moment there were two
 * of them, so the second page could not quietly drift from the first.
 */

export type DocBlock =
  | { kind: "para"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "table"; head: string[]; rows: string[][] };

export type DocSection = { id: string; heading: string; blocks: DocBlock[] };

export function DocArticle({
  title,
  updated,
  intro,
  sections,
  children,
}: {
  title: string;
  updated: string;
  intro: string;
  sections: DocSection[];
  children?: ReactNode;
}) {
  return (
    <main id="main">
      <article className="section section--major section--raised doc">
        <header className="doc__head">
          <h1 className="doc__title">{title}</h1>
          <p className="doc__updated">LAST UPDATED · {updated.toUpperCase()}</p>
          <p className="doc__intro">{intro}</p>
        </header>

        {sections.map((section) => (
          <section key={section.id} id={section.id} className="doc__section">
            <h2 className="doc__heading">{section.heading}</h2>

            {section.blocks.map((block, i) => {
              if (block.kind === "para") {
                return (
                  <p key={i} className="doc__para">
                    {block.text}
                  </p>
                );
              }

              if (block.kind === "list") {
                return (
                  <ul key={i} className="doc__list">
                    {block.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                );
              }

              return (
                <div key={i} className="table-scroll">
                  <table className="defect-table doc__table">
                    <thead>
                      <tr>
                        {block.head.map((h) => (
                          <th key={h} scope="col">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {block.rows.map((row) => (
                        <tr key={row[0]}>
                          {row.map((cell, c) => (
                            <td key={c}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </section>
        ))}

        {children}
      </article>
    </main>
  );
}
