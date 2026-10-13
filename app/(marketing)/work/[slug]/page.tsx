import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CalendlyPopupButton } from "@/components/CalendlyPopupButton";
import { LiteYouTube } from "@/components/LiteYouTube";
import { ctaLabel, portfolioCopy, site } from "@/content/site";
import { getPortfolioItem, getPortfolioItems } from "@/lib/content";

type Params = { params: Promise<{ slug: string }> };

/** Static, like every other public page: built once, refreshed hourly. */
export const revalidate = 3600;

export async function generateStaticParams() {
  return (await getPortfolioItems()).map((item) => ({ slug: item.slug }));
}

/** The first sentence or so of the write-up, for search results and shares. */
function summary(text: string): string {
  if (text.length <= 155) return text;
  const cut = text.slice(0, 155);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const item = await getPortfolioItem(slug);
  if (!item) return { title: "Project not found" };

  const url = `${site.url}/work/${item.slug}`;
  const description = summary(item.description);
  return {
    title: item.title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "article", url, title: item.title, description },
    twitter: { card: "summary_large_image", title: item.title, description },
  };
}

/**
 * One portfolio project: what it was, the stack, the client's video if there
 * is one, and the screenshots if there are any.
 *
 * Everything on the page is a row in `portfolio_items`. The write-up is Sojib's
 * own, as exported from his Upwork portfolio; nothing here adds a figure or a
 * client name that row does not carry.
 *
 * The gallery renders only when the row has images. Most do not yet, and a
 * page with no gallery is a complete page, not a broken one.
 */
export default async function PortfolioItemPage({ params }: Params) {
  const { slug } = await params;
  const item = await getPortfolioItem(slug);
  if (!item) notFound();

  return (
    <main id="main">
      <article className="section pf" aria-labelledby="pf-title">
        <Link href="/work" className="pf__back">
          {portfolioCopy.back}
        </Link>

        <div className="pf__head">
          {item.role ? <span className="eyebrow">{item.role}</span> : null}
          <h1 id="pf-title" className="pf__title">
            {item.title}
          </h1>
          {item.client ? (
            <p className="pf__client">
              {portfolioCopy.clientLabel} {item.client}
            </p>
          ) : null}
        </div>

        <div className="pf__body">
          <div className="pf__text">
            <p className="pf__desc">{item.description}</p>

            <ul className="pf__skills" aria-label={portfolioCopy.skillsLabel}>
              {item.skills.map((skill) => (
                <li key={skill} className="tag">
                  {skill}
                </li>
              ))}
            </ul>

            <div className="pf__actions">
              <CalendlyPopupButton className="btn btn-primary" placement="portfolio">
                {ctaLabel}
              </CalendlyPopupButton>
              <a
                className="btn btn-ghost"
                href={item.url}
                target="_blank"
                rel="noopener"
                data-track-event="cta_click"
                data-track-cta-id="view-on-upwork"
                data-track-cta-text={portfolioCopy.upwork}
              >
                {portfolioCopy.upwork}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </div>
          </div>

          {item.videoId ? (
            <div className="pf__video">
              <LiteYouTube
                id={item.videoId}
                label={`${portfolioCopy.videoLabel}: ${item.title}`}
                orientation="landscape"
                badge={portfolioCopy.videoBadge}
                client={item.client ?? item.title}
              />
            </div>
          ) : null}
        </div>

        {item.images.length > 0 ? (
          <ul className="pf__gallery" aria-label={portfolioCopy.galleryLabel}>
            {item.images.map((image) => (
              <li key={image.src} className="pf__shot">
                <Image
                  src={image.src}
                  alt={image.alt}
                  width={image.width}
                  height={image.height}
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  loading="lazy"
                />
              </li>
            ))}
          </ul>
        ) : null}
      </article>
    </main>
  );
}
