import type { MetadataRoute } from "next";
import { site, work } from "@/content/site";
import { publishedPosts } from "@/content/posts";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

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
    ...work.cases.map((c) => ({
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
