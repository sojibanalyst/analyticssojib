import { LiveEvents } from "@/components/LiveEvents";
import { About } from "@/components/sections/About";
import { CtaBand } from "@/components/sections/CtaBand";
import { TrackingCheck } from "@/components/TrackingCheck";
import { PageHead } from "@/components/ui/PageHead";
import { pages } from "@/content/site";
import { pageMetadata } from "@/lib/page-metadata";

const copy = pages.about;

export const metadata = pageMetadata("/about", copy.title, copy.description);

/**
 * Who, how, and two things to try: the live event stream from this site and
 * the free tracking check. Both fetch in the browser, so the page itself stays
 * static.
 */
export default function AboutPage() {
  return (
    <main id="main">
      <PageHead eyebrow={copy.eyebrow} title={copy.title} lead={copy.lead} titleId="about-page-title" />
      <About />
      <LiveEvents />
      <TrackingCheck />
      <CtaBand />
    </main>
  );
}
