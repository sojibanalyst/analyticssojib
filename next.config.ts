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
  /**
   * Security headers.
   *
   * The set below is the part that cannot break anything: none of it constrains
   * what the page may load, only what a browser may infer or a third party may
   * do with the response.
   *
   * There is deliberately NO full Content-Security-Policy here. GTM injects
   * scripts and inline snippets at runtime, so a script-src policy has to be
   * written against the containers actually in use — get it wrong and tags stop
   * firing with nothing in the UI to say why. `frame-ancestors` is the one CSP
   * directive included, because it governs who may frame this site rather than
   * what this site may load, and it cannot be expressed any other way now that
   * X-Frame-Options is deprecated. A proposal for the rest is in
   * docs/security-headers.md.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Stops a browser second-guessing a Content-Type — the header that
          // turns an uploaded .txt into executable script.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Full URL to this origin, origin only to anyone else. Keeps UTM
          // parameters and paths out of other people's referrer logs while
          // leaving this site's own attribution intact.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Every feature this site does not use, switched off, so an injected
          // script cannot reach for one. Deliberately empty allowlists rather
          // than "self": there is no camera, microphone, geolocation, payment
          // or USB anywhere in this codebase.
          {
            key: "Permissions-Policy",
            value: [
              "accelerometer=()",
              "autoplay=(self)",
              "camera=()",
              "display-capture=()",
              "encrypted-media=(self)",
              "fullscreen=(self)",
              "geolocation=()",
              "gyroscope=()",
              "magnetometer=()",
              "microphone=()",
              "payment=()",
              "picture-in-picture=(self)",
              "usb=()",
              "xr-spatial-tracking=()",
            ].join(", "),
          },
          // Nobody may frame this site. Clickjacking a page whose main action
          // is "book a call" is cheap and worth blocking.
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          // Cross-origin isolation of the response itself. Neither of these
          // affects what the page can load.
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
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
