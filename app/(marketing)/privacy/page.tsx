import type { Metadata } from "next";

import { privacyMeta as meta, privacySections } from "@/content/privacy";
import { site, whatsappDisplay, whatsappUrl } from "@/content/site";

const url = `${site.url}/privacy`;

export const metadata: Metadata = {
  title: meta.title,
  description: meta.description,
  alternates: { canonical: url },
  openGraph: { type: "article", url, title: meta.title, description: meta.description },
  twitter: { card: "summary_large_image", title: meta.title, description: meta.description },
};

/**
 * A document, not a marketing section.
 *
 * The rest of the site centres its headings; this page does not. Centred
 * headings work when a heading introduces a grid of cards you scan. They work
 * badly above a column of text somebody has to read in order, which is what
 * this is — so the whole page is left-aligned on a narrow measure and reads
 * like the reference document it is.
 */
export default function PrivacyPage() {
  return (
    <main id="main">
      <article className="section section--major section--raised doc">
        <header className="doc__head">
          <h1 className="doc__title">{meta.title}</h1>
          <p className="doc__updated">LAST UPDATED · {meta.updated.toUpperCase()}</p>
          <p className="doc__intro">{meta.intro}</p>
        </header>

        {privacySections.map((section) => (
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

        <section id="contact" className="doc__section">
          <h2 className="doc__heading">Who to ask</h2>
          <p className="doc__para">
            {site.fullName}, {site.location}. Email{" "}
            <a href={`mailto:${site.email}`}>{site.email}</a> or message{" "}
            <a href={whatsappUrl} target="_blank" rel="noopener">
              {whatsappDisplay}
            </a>{" "}
            on WhatsApp. Requests about your own data are answered by the same person who
            wrote this page.
          </p>
        </section>
      </article>
    </main>
  );
}
