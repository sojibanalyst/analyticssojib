import Link from "next/link";

import { ProjectCard } from "@/components/ProjectCard";
import { BeforeAfter } from "@/components/sections/BeforeAfter";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { about, pages, services, work, type CaseStudy } from "@/content/site";
import { hasMetric } from "@/lib/case-study";
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
 * The reviews are not here: the homepage uses the Reviews section itself, in
 * its moving form, and /reviews has the full list.
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

/** The first sentence of a service description: enough for a teaser. */
const firstSentence = (text: string) => text.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? text;

export function ServicesTeaser() {
  return (
    <section id="services" className="section section--raised" aria-labelledby="services-title">
      <SectionHeading eyebrow={services.eyebrow} title={services.title} titleId="services-title" />

      <ul className="svc-teaser" data-stagger>
        {services.items.map((item) => (
          <li key={item.code}>
            <Link href="/services" className="svc-teaser__card">
              <span className="svc-meta">
                <span>{item.code}</span>
                <span>{item.duration}</span>
              </span>
              <span className="svc-teaser__title">{item.title}</span>
              <span className="svc-teaser__body">{firstSentence(item.body)}</span>
              <span className="svc-teaser__foot">
                <span className="svc-price">{item.price}</span>
                <span className="svc-teaser__go" aria-hidden="true">
                  →
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <TeaserLink href="/services">{pages.services.teaserLink}</TeaserLink>
    </section>
  );
}

/** How many case studies the homepage shows. The rest are on /case-studies. */
const CASES_SHOWN = 3;

/**
 * One case study as a card in the stack: the problem, the before and after,
 * and a link to the page with the rest.
 */
function StackCase({ item }: { item: CaseStudy }) {
  return (
    <article className="case-stack__card">
      <div className="case-card__bar">
        <span>{item.code}</span>
        <span className="status-pill">
          <span className="status-dot" aria-hidden="true" />
          {item.status}
        </span>
      </div>
      <div className="case-stack__body">
        <div className="case-stack__text">
          <h3 className="case-stack__title">{item.title}</h3>
          <p className="case-stack__desc">{item.body}</p>
          <ul className="case-stack__tags">
            {item.tags.map((tag) => (
              <li key={tag} className="tag">
                {tag}
              </li>
            ))}
          </ul>
        </div>
        {hasMetric(item.metric) ? (
          <div className="case-stack__metric">
            <BeforeAfter metric={item.metric} />
          </div>
        ) : null}
      </div>
      <Link href={`/case-studies/${item.slug}`} className="case-card__more">
        {work.readMore}
      </Link>
    </article>
  );
}

/**
 * The case studies as a stack: each card holds at the top of the screen and
 * the next one slides up over it, so they arrive one at a time. Sticky
 * positioning does the holding, which the compositor handles on its own; where
 * the browser can tie an animation to scroll, the card underneath also eases
 * back a little (transform and opacity only). Under reduced motion they are a
 * plain list.
 */
export function CasesTeaser({ cases }: { cases: CaseStudy[] }) {
  const shown = cases.slice(0, CASES_SHOWN);
  if (!shown.length) return null;
  return (
    <section id="work" className="section section--major section--ink" aria-labelledby="work-title">
      <SectionHeading eyebrow={work.eyebrow} title={pages.caseStudies.teaserTitle} titleId="work-title" />

      <ul className="case-stack" data-scroll-anim>
        {shown.map((item, i) => (
          <li key={item.slug} className="case-stack__item" style={{ ["--i" as string]: i }}>
            <StackCase item={item} />
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

      {/* Each card flies in on its own as it scrolls into view; see
          "Scroll-driven entrances" in app/components.css. */}
      <ul className="bento" data-stagger data-scroll-anim>
        {shown.map((item) => (
          <li key={item.slug} className="bento__item">
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
