/**
 * Snapshots every public page so a refactor can be proved not to have changed
 * one of them.
 *
 *   node scripts/snapshot-pages.mjs <baseUrl> <outDir>
 *
 * Writes two files per route:
 *
 *   <name>.html       exactly what the server sent
 *   <name>.norm.html  the same, normalised for comparison
 *
 * The normalised copy is the one that gets diffed, and what it removes is the
 * whole point:
 *
 *  - every <script>, including the RSC payload in self.__next_f. That payload
 *    is a serialisation of the component tree, so it changes whenever a
 *    component is edited even if the rendered page is byte-identical. Diffing
 *    it would report a change on every refactor and prove nothing.
 *  - chunk and build hashes in /_next/ URLs, which move on every build.
 *  - whitespace between tags, which JSX formatting shifts around.
 *
 * What survives is the markup a visitor actually sees. If that differs, the
 * page really did change.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const base = process.argv[2] || "http://localhost:3100";
const outDir = process.argv[3];

if (!outDir) {
  console.error("usage: node scripts/snapshot-pages.mjs <baseUrl> <outDir>");
  process.exit(1);
}

export const ROUTES = [
  "/",
  "/blog",
  "/blog/prove-ga4-purchase-count-is-wrong",
  "/blog/event-id-deduplication-pixel-and-capi",
  "/blog/consent-mode-v2-without-losing-data",
  "/case-studies/shopify-purchase-accuracy-rebuild",
  "/case-studies/meta-roas-deduplication",
  "/tracking-plan",
  "/sitemap.xml",
  "/robots.txt",
  "/manifest.webmanifest",
];

function fileNameFor(route) {
  return route === "/" ? "index" : route.slice(1).replace(/\//g, "__");
}

export function normalise(html) {
  return (
    html
      // Scripts, including the RSC payload. See the note above.
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<script\b[^>]*\/>/gi, "")
      // Preload/stylesheet links point at hashed build assets.
      .replace(/<link\b[^>]*\/_next\/[^>]*>/gi, "")
      // Any surviving hashed asset path.
      .replace(/\/_next\/static\/[^"')\s]+/g, "/_next/static/HASH")
      // next/font class names are content-hashed per build.
      .replace(/__(className|variable)_[0-9a-f]{6,}/g, "__$1_HASH")
      // sitemap.xml stamps <lastmod> with the build time. Caught by running
      // this script twice against the same code — without it, every rebuild
      // reports sitemap.xml as changed.
      .replace(
        /<lastmod>[^<]*<\/lastmod>/g,
        "<lastmod>BUILD_TIME</lastmod>",
      )
      .replace(/\s+/g, " ")
      .replace(/>\s+</g, "><")
      .trim()
  );
}

async function main() {
  await mkdir(outDir, { recursive: true });
  let failed = 0;

  for (const route of ROUTES) {
    const res = await fetch(base + route, { redirect: "manual" });
    if (res.status !== 200) {
      console.log(`FAIL  ${String(res.status).padEnd(3)} ${route}`);
      failed++;
      continue;
    }
    const html = await res.text();
    const name = fileNameFor(route);
    await writeFile(path.join(outDir, `${name}.html`), html, "utf8");
    await writeFile(path.join(outDir, `${name}.norm.html`), normalise(html), "utf8");
    console.log(`  ok   ${String(html.length).padStart(7)} bytes  ${route}`);
  }

  console.log(failed ? `\n${failed} route(s) failed` : `\nsnapshot written to ${outDir}`);
  process.exit(failed ? 1 : 0);
}

main();
