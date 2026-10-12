import Image from "next/image";
import { hero, proof, site, upworkUrl } from "@/content/site";
import { CalendlyPopupButton } from "@/components/CalendlyPopupButton";
import { HeroParallax } from "@/components/hero/HeroParallax";
import { PipelineSvg } from "@/components/hero/PipelineSvg";
import { EventChip } from "@/components/ui/EventChip";

/**
 * The hero. Copy on one side, the pipeline on the other.
 *
 * The portrait that used to fill this section is in About now. What is left of
 * it here is a 44px avatar beside the name, because a face next to a claim is
 * still worth having and a face the size of the screen was the claim's rival.
 *
 * With the photo gone the largest thing painted is the headline, which is
 * text, so the LCP no longer waits on an image request at all.
 */
export function Hero() {
  const { pipeline } = hero;

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-grid">
        <div className="hero-copy">
          <span className="hero-badge">{hero.eyebrow}</span>

          <h1 id="hero-title" className="hero-h1">
            {hero.headline.a} <span className="hero-h1__accent">{hero.headline.accent1}</span>{" "}
            {hero.headline.b} {hero.headline.c}{" "}
            <span className="hero-h1__accent">{hero.headline.accent2}</span>
          </h1>

          <p className="hero-lead">{hero.lead}</p>

          <div className="hero-ctas">
            <CalendlyPopupButton className="btn btn-primary" placement="hero">
              {hero.primaryCta}
            </CalendlyPopupButton>
            <a href={hero.secondaryHref} className="btn btn-ghost">
              {hero.secondaryCta}
            </a>
          </div>

          <a className="hero-id" href={upworkUrl} target="_blank" rel="noopener">
            <Image
              src={hero.avatar.src}
              alt=""
              width={44}
              height={44}
              sizes="44px"
              className="hero-id__avatar"
            />
            <span className="hero-id__text">
              <span className="hero-id__name">{site.name}</span>
              <span className="hero-id__trust">{proof.trustLine}</span>
            </span>
          </a>
        </div>

        <div className="hero-visual" data-hero-parallax>
          <div className="hero-visual__glow" aria-hidden="true" />
          <PipelineSvg />
          {/* The same story as the diagram, in one line of text. It is what a
              reader gets if the drawing is too small to read. */}
          <p className="hero-visual__legend">
            <EventChip
              name={pipeline.events[pipeline.events.length - 1]}
              destinations={[...pipeline.platforms]}
            />
          </p>
        </div>
      </div>

      <HeroParallax />
    </section>
  );
}
