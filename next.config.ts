import type { NextConfig } from "next";
import { site } from "./content/site";

const apex = new URL(site.url).host;

const nextConfig: NextConfig = {
  // One canonical host. Without this both apex and www answer 200 with
  // identical content, which is duplicate content for crawlers.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: `www.${apex}` }],
        destination: `${site.url}/:path*`,
        permanent: true,
      },
      // /services was linked externally and in the footer but never existed.
      // Handled here rather than as a route handler so it resolves at the edge
      // without invoking a function.
      { source: "/services", destination: "/#services", permanent: true },
    ];
  },
  // A stray package-lock.json in the home directory makes Next guess the wrong
  // workspace root; pin it to this project.
  turbopack: { root: __dirname },
  images: {
    // AVIF first: the hero photo is the LCP element on mobile, and AVIF cuts
    // roughly a third off the WebP size for this kind of dark portrait.
    formats: ["image/avif", "image/webp"],
    // Next 16 ignores a `quality` prop unless the value is allow-listed here.
    qualities: [62, 75],
    remotePatterns: [
      // YouTube poster frames for the lite testimonial facades.
      { protocol: "https", hostname: "i.ytimg.com", pathname: "/vi/**" },
    ],
  },
};

export default nextConfig;
