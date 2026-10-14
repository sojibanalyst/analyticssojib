import Image from "next/image";
import Link from "next/link";

import { Deck } from "@/components/ui/Deck";
import { BeforeAfter } from "@/components/sections/BeforeAfter";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { about, hero, pages, services, work, type CaseStudy } from "@/content/site";
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
 * The case studies as a deck (see Deck): wide screens only, because a case
 * card on a phone is taller than the screen and would be covered unread.
 */
export function CasesTeaser({ cases }: { cases: CaseStudy[] }) {
  const shown = cases.slice(0, CASES_SHOWN);
  if (!shown.length) return null;
  return (
    <section id="work" className="section section--major section--ink" aria-labelledby="work-title">
      <SectionHeading eyebrow={work.eyebrow} title={pages.caseStudies.teaserTitle} titleId="work-title" />

      <Deck wideOnly>
        {shown.map((item) => (
          <StackCase key={item.slug} item={item} />
        ))}
      </Deck>

      <TeaserLink href="/case-studies">{pages.caseStudies.teaserLink}</TeaserLink>
    </section>
  );
}

/** Featured projects on the homepage. Everything else is on /work. */
const PROJECTS_SHOWN = 6;

/** One featured project as a deck card: the screenshot large, the story beside it. */
function ProjectDeckCard({ item, index, total }: { item: PortfolioItem; index: number; total: number }) {
  const cover = item.images[0];
  return (
    <Link href={`/work/${item.slug}`} className="pdeck">
      <span className="pdeck__media">
        {cover ? (
          <Image
            className="pdeck__img"
            src={cover.src}
            alt=""
            width={cover.width}
            height={cover.height}
            sizes="(min-width: 900px) 640px, 100vw"
            loading="lazy"
          />
        ) : (
          <span className="pdeck__placeholder" aria-hidden="true">
            {item.title.slice(0, 1)}
          </span>
        )}
      </span>
      <span className="pdeck__text">
        <span className="pdeck__top">
          <span className="pdeck__count" aria-hidden="true">
            {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
          {item.videoId ? <span className="more-card__video">{work.videoMark}</span> : null}
        </span>
        <span className="pdeck__title">{item.title}</span>
        <span className="pdeck__desc">{item.description}</span>
        <span className="more-card__skills">
          {item.skills.slice(0, 4).map((skill) => (
            <span key={skill} className="more-card__skill">
              {skill}
            </span>
          ))}
        </span>
        <span className="pdeck__go">
          {work.moreGo} <span aria-hidden="true">→</span>
        </span>
      </span>
    </Link>
  );
}

export function ProjectsTeaser({ items }: { items: PortfolioItem[] }) {
  const shown = items.filter((item) => item.featured).slice(0, PROJECTS_SHOWN);
  if (!shown.length) return null;
  return (
    <section id="projects" className="section" aria-labelledby="projects-title">
      <SectionHeading title={pages.work.teaserTitle} titleId="projects-title" />

      <Deck>
        {shown.map((item, i) => (
          <ProjectDeckCard key={item.slug} item={item} index={i} total={shown.length} />
        ))}
      </Deck>

      <TeaserLink href="/work">
        {pages.work.teaserLink.replace(" →", ` (${items.length}) →`)}
      </TeaserLink>
    </section>
  );
}

/** Short: the photo, the line, the credentials, and the way to the rest. */
export function AboutTeaser() {
  return (
    <section id="about" className="section about-teaser" aria-labelledby="about-title">
      <Image
        src="/about.jpg"
        alt={hero.imageAlt}
        width={590}
        height={635}
        sizes="(min-width: 760px) 240px, 160px"
        quality={75}
        className="about-teaser__photo"
      />
      <div className="about-teaser__text">
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
      </div>
    </section>
  );
}
