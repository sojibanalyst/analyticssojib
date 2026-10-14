import type { Metadata } from "next";
import Link from "next/link";

import { ProjectCard } from "@/components/ProjectCard";
import { CtaBand } from "@/components/sections/CtaBand";
import { portfolioCopy, site, upworkUrl } from "@/content/site";
import { getPortfolioItems } from "@/lib/content";

/** Static, like every other public page: built once, refreshed hourly. */
export const revalidate = 3600;

const url = `${site.url}/work`;

export const metadata: Metadata = {
  title: portfolioCopy.indexTitle,
  description: portfolioCopy.indexDescription,
  alternates: { canonical: url },
  openGraph: {
    type: "website",
    url,
    title: `${portfolioCopy.indexTitle} | ${site.name}`,
    description: portfolioCopy.indexDescription,
  },
};

/**
 * Every published project, on one page.
 *
 * This exists so the homepage does not have to carry all of them. It used to:
 * fifty cards inside a closed <details>, which was a third of that page's HTML
 * for something most visitors never opened. The homepage now shows the
 * featured projects and the first nine, and links here for the rest.
 */
export default async function WorkIndexPage() {
  const items = await getPortfolioItems();
  const featured = items.filter((item) => item.featured);
  const rest = items.filter((item) => !item.featured);

  return (
    <main id="main">
      <section className="section pf" aria-labelledby="work-index-title">
        <Link href="/#projects" className="pf__back">
          {portfolioCopy.backHome}
        </Link>

        <div className="pf__head">
          <span className="eyebrow">{portfolioCopy.indexEyebrow}</span>
          <h1 id="work-index-title" className="pf__title">
            {portfolioCopy.indexTitle}
          </h1>
          <p className="pf__desc">
            {items.length} {portfolioCopy.indexLead}{" "}
            <a href={upworkUrl} target="_blank" rel="noopener">
              {portfolioCopy.upworkInline}
            </a>
            .
          </p>
        </div>

        {featured.length > 0 && (
          <ul className="more-work__grid more-work__grid--featured">
            {featured.map((item) => (
              <li key={item.slug}>
                <ProjectCard item={item} />
              </li>
            ))}
          </ul>
        )}

        <ul className="more-work__grid">
          {rest.map((item, i) => (
            <li key={item.slug}>
              <ProjectCard item={item} index={i} />
            </li>
          ))}
        </ul>
      </section>

      <CtaBand />
    </main>
  );
}
