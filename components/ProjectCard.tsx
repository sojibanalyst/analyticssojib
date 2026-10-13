import Image from "next/image";
import Link from "next/link";

import { work } from "@/content/site";
import type { PortfolioItem } from "@/lib/content";

/**
 * One portfolio project as a card, linking to its page at /work/<slug>.
 *
 * Used on the homepage and on the /work index, so it lives here rather than in
 * either. A featured project gets the larger card with the opening lines of
 * its write-up; the rest get the title, three skills and a number.
 *
 * The cover is the project's first screenshot, when it has one. Its alt is
 * empty on purpose: the card's link already carries the project's title, and
 * a second description of the same thing is noise to a screen reader.
 */
export function ProjectCard({ item, index }: { item: PortfolioItem; index?: number }) {
  const cover = item.images[0];

  return (
    <Link
      className="more-card"
      href={`/work/${item.slug}`}
      data-featured={item.featured || undefined}
    >
      {cover ? (
        <Image
          className="more-card__cover"
          src={cover.src}
          alt=""
          width={cover.width}
          height={cover.height}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          loading="lazy"
        />
      ) : null}
      <span className="more-card__top">
        {index !== undefined ? (
          <span className="more-card__index" aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
          </span>
        ) : null}
        {item.videoId ? <span className="more-card__video">{work.videoMark}</span> : null}
      </span>
      <span className="more-card__title">{item.title}</span>
      {item.featured ? <span className="more-card__desc">{item.description}</span> : null}
      <span className="more-card__skills">
        {item.skills.slice(0, item.featured ? 5 : 3).map((skill) => (
          <span key={skill} className="more-card__skill">
            {skill}
          </span>
        ))}
      </span>
      <span className="more-card__go">{work.moreGo} →</span>
    </Link>
  );
}
