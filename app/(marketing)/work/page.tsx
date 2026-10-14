import type { Metadata } from "next";
import Link from "next/link";

import { CtaBand } from "@/components/sections/CtaBand";
import { WorkGrid } from "@/components/WorkGrid";
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
 * Every published project with screenshots, on one page, filterable by skill
 * (components/WorkGrid.tsx). Projects with no screenshots are left out of the
 * grid and counted under it, with the link to Upwork where they all are; their
 * own pages still exist and are still in the sitemap.
 *
 * The homepage shows six featured projects and links here for the rest.
 */
export default async function WorkIndexPage() {
  const items = await getPortfolioItems();
  const withImages = items.filter((item) => item.images.length > 0);
  const without = items.length - withImages.length;

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

        <WorkGrid items={withImages} />

        {without > 0 ? (
          <p className="work-more">
            <a href={upworkUrl} target="_blank" rel="noopener">
              {without} {portfolioCopy.moreOnUpwork} →
            </a>
          </p>
        ) : null}
      </section>

      <CtaBand />
    </main>
  );
}
