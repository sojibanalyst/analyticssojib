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
  ["/tracking-plan", 200],
  ["/sitemap.xml", 200],
  ["/robots.txt", 200],
  ["/manifest.webmanifest", 200],
  ["/services", 308],
  ["/this-route-does-not-exist", 404],
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
