import type { MetadataRoute } from "next";
import { site } from "@/content/site";
import { getCaseStudies, getPublishedPosts } from "@/lib/content";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [cases, publishedPosts] = await Promise.all([
    getCaseStudies(),
    getPublishedPosts(),
  ]);

  return [
    {
      url: site.url,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${site.url}/tracking-plan`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.9,
    },
    ...cases.map((c) => ({
      url: `${site.url}/case-studies/${c.slug}`,
      lastModified: now,
      changeFrequency: "yearly" as const,
      priority: 0.8,
    })),
    // Drafts are noindex, so they stay out of the sitemap until published.
    ...publishedPosts.map((p) => ({
      url: `${site.url}/blog/${p.slug}`,
      lastModified: p.date ? new Date(p.date) : now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
