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
import { Faq } from "@/components/sections/Faq";
import { Contact } from "@/components/sections/Contact";
import {
  getCaseStudies,
  getFaqs,
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

export default async function Home() {
  // One round trip each, in parallel. Sequential awaits here would add four
  // round trips to every build.
  const [cases, videoReviews, writtenReviews, posts, faqs] = await Promise.all([
    getCaseStudies(),
    getVideoReviews(),
    getWrittenReviews(),
    getPosts(),
    getFaqs(),
  ]);

  return (
    <>
      <main id="main">
        <Hero />
        <StatBand />
        <StackStrip />
        <Symptoms />
        <Services />
        <Work cases={cases} />
        <Reviews items={videoReviews} written={writtenReviews} />
        <Process />
        <About />
        <Notes posts={posts} />
        <Faq items={faqs} />
        <Contact />
      </main>
    </>
  );
}
