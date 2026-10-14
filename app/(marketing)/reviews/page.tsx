import { CtaBand } from "@/components/sections/CtaBand";
import { Reviews } from "@/components/sections/Reviews";
import { PageHead } from "@/components/ui/PageHead";
import { pages } from "@/content/site";
import { getVideoReviews, getWrittenReviews } from "@/lib/content";
import { pageMetadata } from "@/lib/page-metadata";

/** Static, like every other public page: built once, refreshed hourly. */
export const revalidate = 3600;

const copy = pages.reviews;

export const metadata = pageMetadata("/reviews", copy.title, copy.description);

/** Every video review and every written one, and nothing else. */
export default async function ReviewsPage() {
  const [videoReviews, writtenReviews] = await Promise.all([getVideoReviews(), getWrittenReviews()]);
  return (
    <main id="main">
      <PageHead eyebrow={copy.eyebrow} title={copy.title} lead={copy.lead} titleId="reviews-page-title" />
      <Reviews items={videoReviews} written={writtenReviews} all />
      <CtaBand />
    </main>
  );
}
