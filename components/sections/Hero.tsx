import Image from "next/image";
import { hero, linkedinUrl, proof, upworkUrl } from "@/content/site";
import { CalendlyPopupButton } from "@/components/CalendlyPopupButton";
import { SocialIcon } from "@/components/ui/Icon";

export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      {/* Both photos ship; CSS shows the one matching the theme. The light
          variant is the priority image because light is the default, so it is
          the one that decides LCP. */}
      <Image
        src="/hero-light.jpg"
        alt={hero.imageAlt}
        width={1200}
        height={675}
        priority
        fetchPriority="high"
        quality={62}
        sizes="100vw"
        className="hero-img hero-img--light"
      />
      {/* Hidden at opacity 0 until the theme flips. It sits inside the initial
          viewport, so the browser still fetches it on the first layout pass —
          the toggle stays instant — but at low priority, so it does not
          compete with the LCP image over a slow connection. */}
      <Image
        src="/hero-dark.jpg"
        alt=""
        aria-hidden="true"
        width={1440}
        height={810}
        loading="lazy"
        fetchPriority="low"
        quality={62}
        sizes="100vw"
        className="hero-img hero-img--dark"
      />

      <div aria-hidden="true" className="hero-wash" />

      <div className="hero-body">
        <span className="hero-badge">{hero.eyebrow}</span>

        <h1 id="hero-title" className="hero-h1">
          {hero.headline.a}{" "}
          <span style={{ color: "var(--ink)" }}>{hero.headline.accent1}</span>{" "}
          {hero.headline.b} <span style={{ whiteSpace: "nowrap" }}>{hero.headline.c}</span>{" "}
          <span style={{ color: "var(--ink)", whiteSpace: "nowrap" }}>
            {hero.headline.accent2}
          </span>
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

        <div className="hero-trust">
          <a href={upworkUrl} target="_blank" rel="noopener">
            <SocialIcon name="upwork" size={16} />
            {proof.chip}
          </a>
          <a href={linkedinUrl} target="_blank" rel="noopener">
            <SocialIcon name="linkedin" size={16} />
            LINKEDIN
          </a>
        </div>
      </div>
    </section>
  );
}
