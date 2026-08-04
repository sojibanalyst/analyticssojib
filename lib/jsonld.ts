import { about, faq, site, socials } from "@/content/site";

const sameAs = socials.map((s) => s.href);

export const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": `${site.url}/#person`,
  name: site.fullName,
  alternateName: site.name,
  url: site.url,
  email: `mailto:${site.email}`,
  jobTitle: site.role,
  description: site.description,
  knowsAbout: [
    "Google Analytics 4",
    "Google Tag Manager",
    "Server-side tagging",
    "Meta Conversions API",
    "Google Ads enhanced conversions",
    "Ecommerce tracking",
    "Looker Studio",
  ],
  address: {
    "@type": "PostalAddress",
    addressLocality: "Dhaka",
    addressCountry: "BD",
  },
  sameAs,
};

export const professionalServiceJsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "@id": `${site.url}/#service`,
  name: `${site.name} — Analytics & Tracking`,
  url: site.url,
  description: site.description,
  email: `mailto:${site.email}`,
  provider: { "@id": `${site.url}/#person` },
  areaServed: "Worldwide",
  availableLanguage: ["en"],
  address: {
    "@type": "PostalAddress",
    addressLocality: "Dhaka",
    addressCountry: "BD",
  },
  sameAs,
  // Rating is reproduced from the Upwork profile; aggregateRating is
  // deliberately omitted because Google requires self-hosted, verifiable
  // reviews for it and these live on Upwork.
  knowsAbout: about.chips,
};

export const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": `${site.url}/#faq`,
  mainEntity: faq.items.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

/** Serialise for <script type="application/ld+json">, escaping `<` safely. */
export function ldJson(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
