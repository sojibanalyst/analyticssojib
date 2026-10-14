import type { MetadataRoute } from "next";
import { site } from "@/content/site";

export default function robots(): MetadataRoute.Robots {
  return {
    // The console is behind a sign-in and carries a noindex, and the API
    // routes are not pages. Disallowing both keeps crawlers from spending
    // requests on URLs that will only ever redirect or return JSON.
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api"] }],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
