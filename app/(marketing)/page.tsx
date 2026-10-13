import type { Metadata } from "next";
import { site } from "@/content/site";
import { Hero } from "@/components/sections/Hero";
import { StatBand } from "@/components/sections/StatBand";
import { StackStrip } from "@/components/sections/StackStrip";
import { Symptoms } from "@/components/sections/Symptoms";
import { Services } from "@/components/sections/Services";
import { Work } from "@/components/sections/Work";
import { Reviews } from "@/components/sections/Reviews";
import { Process } from "@/components/sections/Process";
import { About } from "@/components/sections/About";
import { Notes } from "@/components/sections/Notes";
import { LiveEvents } from "@/components/LiveEvents";
import { TrackingCheck } from "@/components/TrackingCheck";
import { Faq } from "@/components/sections/Faq";
import { Contact } from "@/components/sections/Contact";
import {
  getCaseStudies,
  getFaqs,
  getPortfolioItems,
  getPosts,
  getVideoReviews,
  getWrittenReviews,
} from "@/lib/content";

/**
 * Prerendered at build time and refreshed hourly — still ○ in the build
 * output, not ƒ. The reads below are cached GETs, which is what keeps it that
 * way; see lib/content/client.ts.
 *
 * The literal is required: Next has to read this value without evaluating the
 * module, so `CONTENT_REVALIDATE` imported from lib/content/client would not
 * be statically analysable. It is kept in step with that constant by hand.
 */
export const revalidate = 3600;

/** The homepage's own canonical. It used to be inherited from the root layout,
 *  by this page and by every other route that did not set one. */
export const metadata: Metadata = { alternates: { canonical: site.url } };

export default async function Home() {
  // One round trip each, in parallel. Sequential awaits here would add four
  // round trips to every build.
  const [cases, videoReviews, writtenReviews, posts, faqs, portfolio] = await Promise.all([
    getCaseStudies(),
    getVideoReviews(),
    getWrittenReviews(),
    getPosts(),
    getFaqs(),
    getPortfolioItems(),
  ]);

  return (
    <>
      <main id="main">
        <Hero />
        <StatBand />
        <StackStrip />
        <Symptoms />
        <Services />
        <Work cases={cases} more={portfolio} />
        <Reviews items={videoReviews} written={writtenReviews} />
        <Process />
        <About />
        <LiveEvents />
        <Notes posts={posts} />
        <TrackingCheck />
        <Faq items={faqs} />
        <Contact />
      </main>
    </>
  );
}
