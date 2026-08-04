import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
