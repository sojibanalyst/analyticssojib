import { CtaBand } from "@/components/sections/CtaBand";
import { Faq } from "@/components/sections/Faq";
import { Process } from "@/components/sections/Process";
import { Services } from "@/components/sections/Services";
import { PageHead } from "@/components/ui/PageHead";
import { pages } from "@/content/site";
import { getFaqs } from "@/lib/content";
import { pageMetadata } from "@/lib/page-metadata";

/** Static, like every other public page: built once, refreshed hourly. */
export const revalidate = 3600;

const copy = pages.services;

export const metadata = pageMetadata("/services", copy.title, copy.description);

/**
 * The four services in full, how the work runs, and the questions about price
 * and timelines. This URL used to redirect to /#services; it is a page now,
 * and that anchor still lands on the homepage teaser.
 */
export default async function ServicesPage() {
  const faqs = await getFaqs();
  return (
    <main id="main">
      <PageHead eyebrow={copy.eyebrow} title={copy.title} lead={copy.lead} titleId="services-page-title" />
      <Services />
      <Process />
      <Faq items={faqs} />
      <CtaBand />
    </main>
  );
}
