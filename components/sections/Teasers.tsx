import Link from "next/link";

import { ProjectCard } from "@/components/ProjectCard";
import { CompactCase } from "@/components/sections/CaseFiles";
import { ReviewCard } from "@/components/ui/ReviewCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import {
  about,
  pages,
  reviews,
  services,
  work,
  type CaseStudy,
  type WrittenReview,
} from "@/content/site";
import type { PortfolioItem } from "@/lib/content";

/**
 * The homepage, one teaser per page behind the nav.
 *
 * Each says enough to decide whether to click and ends in exactly one link to
 * the page that has the whole thing. Nothing here is a full list: the lists
 * live on their own pages, once.
 *
 * The section ids are the old anchors (#services, #work, #reviews, #about),
 * so a link to /#work from before the split still lands on the right topic.
 */

function TeaserLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <div className="teaser__foot">
      <Link href={href} className="btn btn-ghost">
        {children}
      </Link>
    </div>
  );
}

export function ServicesTeaser() {
  return (
    <section id="services" className="section section--raised" aria-labelledby="services-title">
      <SectionHeading eyebrow={services.eyebrow} title={services.title} titleId="services-title" />

      <ul className="svc-teaser" data-stagger>
        {services.items.map((item) => (
          <li key={item.code} className="card svc-teaser__item">
            <div className="svc-meta">
              <span>{item.code}</span>
              <span>{item.duration}</span>
            </div>
            <h3 className="svc-title">{item.title}</h3>
            <p className="svc-price">{item.price}</p>
          </li>
        ))}
      </ul>

      <TeaserLink href="/services">{pages.services.teaserLink}</TeaserLink>
    </section>
  );
}

/** How many case studies the homepage shows. The rest are on /case-studies. */
const CASES_SHOWN = 3;

export function CasesTeaser({ cases }: { cases: CaseStudy[] }) {
  const shown = cases.slice(0, CASES_SHOWN);
  if (!shown.length) return null;
  return (
    <section id="work" className="section section--major section--ink" aria-labelledby="work-title">
      <SectionHeading eyebrow={work.eyebrow} title={pages.caseStudies.teaserTitle} titleId="work-title" />

      {/* Three columns only when there are three; two sit side by side. */}
      <ul
        className={`case-compact__grid${shown.length > 2 ? " case-compact__grid--three" : ""}`}
        data-stagger
      >
        {shown.map((item) => (
          <li key={item.slug}>
            <CompactCase item={item} />
          </li>
        ))}
      </ul>

      <TeaserLink href="/case-studies">{pages.caseStudies.teaserLink}</TeaserLink>
    </section>
  );
}

/** Featured projects on the homepage. Everything else is on /work. */
const PROJECTS_SHOWN = 6;

export function ProjectsTeaser({ items }: { items: PortfolioItem[] }) {
  const shown = items.filter((item) => item.featured).slice(0, PROJECTS_SHOWN);
  if (!shown.length) return null;
  return (
    <section id="projects" className="section" aria-labelledby="projects-title">
      <SectionHeading title={pages.work.teaserTitle} titleId="projects-title" />

      <ul className="more-work__grid more-work__grid--featured" data-stagger>
        {shown.map((item) => (
          <li key={item.slug}>
            <ProjectCard item={item} />
          </li>
        ))}
      </ul>

      <TeaserLink href="/work">
        {pages.work.teaserLink.replace(" →", ` (${items.length}) →`)}
      </TeaserLink>
    </section>
  );
}

/** Written reviews on the homepage. Every one, and the videos, are on /reviews. */
const REVIEWS_SHOWN = 3;

export function ReviewsTeaser({ written }: { written: WrittenReview[] }) {
  const real = written.filter((item) => !item.placeholder && item.quote.trim() !== "");
  if (!real.length) return null;
  return (
    <section id="reviews" className="section section--raised" aria-labelledby="reviews-title">
      <SectionHeading eyebrow={pages.reviews.eyebrow} title={pages.reviews.teaserTitle} titleId="reviews-title" />

      <ul className="rv-teaser" data-stagger>
        {real.slice(0, REVIEWS_SHOWN).map((item) => (
          <li key={item.attribution + item.quote.slice(0, 24)}>
            <ReviewCard
              quote={item.quote}
              attribution={item.attribution}
              verifiedLabel={reviews.verified}
              clamp
            />
          </li>
        ))}
      </ul>

      <TeaserLink href="/reviews">{pages.reviews.teaserLink}</TeaserLink>
    </section>
  );
}

export function AboutTeaser() {
  return (
    <section id="about" className="section" aria-labelledby="about-title">
      <SectionHeading eyebrow={pages.about.eyebrow} title={about.title} titleId="about-title" />
      <p className="teaser__body">{about.pullquote}</p>
      <ul className="teaser__chips">
        {about.chips.map((chip) => (
          <li key={chip} className="pill">
            {chip}
          </li>
        ))}
      </ul>
      <TeaserLink href="/about">{pages.about.teaserLink}</TeaserLink>
    </section>
  );
}
