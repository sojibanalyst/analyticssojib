/**
 * Route parity check.
 *
 *   node scripts/check-routes.mjs [baseUrl]
 *
 * Asserts every public URL still resolves after the route-group restructure.
 * Route groups like (marketing) must never appear in a path, and no public URL
 * may change — this is the check that proves it, and it runs in CI.
 *
 * Exits non-zero on the first failure so a red run blocks merge.
 */
const base = process.argv[2] || "http://localhost:3000";

/** [path, expectedStatus, mustContain?] */
const ROUTES = [
  ["/", 200, "TRACKING INTEGRITY"],
  ["/blog", 200],
  ["/blog/prove-ga4-purchase-count-is-wrong", 200],
  ["/blog/event-id-deduplication-pixel-and-capi", 200],
  ["/blog/consent-mode-v2-without-losing-data", 200],
  ["/case-studies/shopify-purchase-accuracy-rebuild", 200],
  ["/case-studies/meta-roas-deduplication", 200],
  // Portfolio project pages, added in the 2026 redesign. One featured, one not.
  ["/work", 200, "All projects"],
  ["/work/server-side-tracking-using-stape-io", 200],
  ["/work/ga4-custom-report-setup", 200],
  ["/work/this-project-does-not-exist", 404],
  ["/tracking-plan", 200],
  ["/privacy", 200],
  ["/terms", 200],
  ["/sitemap.xml", 200],
  ["/robots.txt", 200],
  ["/manifest.webmanifest", 200],
  // /services redirected (308) to /#services until it became a page of its
  // own in the one-page-one-job split. The URL kept working throughout; it
  // now answers 200 instead of a redirect.
  ["/services", 200, "Four ways in"],
  // The pages behind the nav, added in the same split.
  ["/case-studies", 200, "Case studies"],
  ["/reviews", 200, "What clients said"],
  ["/about", 200, "About Sojib"],
  ["/this-route-does-not-exist", 404],
  // An /admin path that does not exist. Signed out it is the middleware that
  // answers, exactly as it does for a real console screen; signed in it now
  // renders the console's own not-found inside the shell rather than the
  // public 404 outside it.
  ["/admin/zzz-not-a-page", 307],

  // The console. Signed out is the only state this script can test, and it is
  // the one that matters: /admin must never render to a stranger.
  ["/admin", 307],
  ["/admin/settings", 307],
  ["/admin/portfolio", 307],
  ["/admin/login", 200, "Email"],

  // The collector accepts POST only. A GET returning 405 is the check that it
  // exists and has not quietly become a page.
  ["/api/collect", 405],

  // The tracking check accepts POST only, like the collector.
  ["/api/tracking-check", 405],

  // The public read behind the live panel. JSON with an `events` array, and
  // nothing else at the top level.
  ["/api/events/recent", 200, '"events"'],
];

let failed = 0;

for (const [path, expected, mustContain] of ROUTES) {
  let status = 0;
  let body = "";
  try {
    const res = await fetch(base + path, { redirect: "manual" });
    status = res.status;
    if (mustContain) body = await res.text();
  } catch (err) {
    console.log(`FAIL ${path} — ${err.message}`);
    failed++;
    continue;
  }

  const statusOk = status === expected;
  const bodyOk = !mustContain || body.includes(mustContain);

  if (statusOk && bodyOk) {
    console.log(`  ok   ${String(status).padEnd(3)} ${path}`);
  } else {
    console.log(
      `FAIL  ${String(status).padEnd(3)} ${path}` +
        (statusOk ? ` — missing ${JSON.stringify(mustContain)}` : ` — expected ${expected}`),
    );
    failed++;
  }
}

// A route group leaking into a URL is the specific regression this guards.
for (const group of ["/(marketing)", "/(admin)"]) {
  const res = await fetch(base + group, { redirect: "manual" }).catch(() => null);
  if (res && res.status === 200) {
    console.log(`FAIL  ${group} resolves — route group leaked into a public URL`);
    failed++;
  } else {
    console.log(`  ok   ${group} does not resolve`);
  }
}

console.log(failed ? `\n${failed} route check(s) failed` : "\nall routes ok");
process.exit(failed ? 1 : 0);
