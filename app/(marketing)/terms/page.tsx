import type { Metadata } from "next";

import { DocArticle } from "@/components/DocArticle";
import { site, whatsappDisplay, whatsappUrl } from "@/content/site";
import { termsMeta as meta, termsSections } from "@/content/terms";

const url = `${site.url}/terms`;

export const metadata: Metadata = {
  title: meta.title,
  description: meta.description,
  alternates: { canonical: url },
  openGraph: { type: "article", url, title: meta.title, description: meta.description },
  twitter: { card: "summary_large_image", title: meta.title, description: meta.description },
};

export default function TermsPage() {
  return (
    <DocArticle
      title={meta.title}
      updated={meta.updated}
      intro={meta.intro}
      sections={termsSections}
    >
      <section id="contact" className="doc__section">
        <h2 className="doc__heading">Who to ask</h2>
        <p className="doc__para">
          {site.fullName}, {site.location}. Email{" "}
          <a href={`mailto:${site.email}`}>{site.email}</a> or message{" "}
          <a href={whatsappUrl} target="_blank" rel="noopener">
            {whatsappDisplay}
          </a>{" "}
          on WhatsApp. What this site records about you is set out on the{" "}
          <a href="/privacy">privacy page</a>.
        </p>
      </section>
    </DocArticle>
  );
}
