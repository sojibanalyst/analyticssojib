import type { Metadata } from "next";
import { site } from "@/content/site";
import { Hero } from "@/components/sections/Hero";
import { StatBand } from "@/components/sections/StatBand";
import { StackStrip } from "@/components/sections/StackStrip";
import { Symptoms } from "@/components/sections/Symptoms";
import {
  AboutTeaser,
  CasesTeaser,
  ProjectsTeaser,
  ServicesTeaser,
} from "@/components/sections/Teasers";
import { Reviews } from "@/components/sections/Reviews";
import { Notes } from "@/components/sections/Notes";
import { Contact } from "@/components/sections/Contact";
import { TrackingCheck } from "@/components/TrackingCheck";
import {
  getCaseStudies,
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

/**
 * The homepage is a set of teasers, one per page behind the nav, each ending
 * in one link to that page. The full services, case studies, projects,
 * FAQ, live events and tracking check each live on their own page, once. The
 * reviews are the exception: the homepage has the video carousel and the
 * written reviews as moving rows, and /reviews has every one in full. The
 * contact block is here, at the bottom, and nowhere else; the other pages end
 * in the CTA band.
 */
export default async function Home() {
  // One round trip each, in parallel. Sequential awaits here would add a
  // round trip per read to every build.
  const [cases, videoReviews, writtenReviews, posts, portfolio] = await Promise.all([
    getCaseStudies(),
    getVideoReviews(),
    getWrittenReviews(),
    getPosts(),
    getPortfolioItems(),
  ]);

  return (
    <>
      <main id="main">
        <Hero />
        <StatBand />
        <StackStrip />
        <Symptoms />
        <ServicesTeaser />
        <CasesTeaser cases={cases} />
        <ProjectsTeaser items={portfolio} />
        <Reviews items={videoReviews} written={writtenReviews} home />
        <AboutTeaser />
        <Notes posts={posts} />
        <Contact />
        {/* The free tracking check, last before the footer: a visitor who
            reads to the end can try it here without leaving. It is on /about
            too. */}
        <TrackingCheck />
      </main>
    </>
  );
}
