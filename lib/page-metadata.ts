import type { Metadata } from "next";

import { site } from "@/content/site";

/**
 * Title, description, canonical and Open Graph for a page behind the nav, so
 * no page ships without its own canonical and none inherits the homepage's.
 */
export function pageMetadata(path: string, title: string, description: string): Metadata {
  const url = `${site.url}${path}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", url, title: `${title} | ${site.name}`, description },
  };
}
