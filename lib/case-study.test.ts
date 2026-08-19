import assert from "node:assert/strict";
import { test } from "node:test";
import { canClaimReconciliation, hasFigures, hasMetric } from "./case-study.ts";

const metric = (before: string, after: string) => ({
  caption: "GA4 purchases vs Shopify orders",
  beforeLabel: "BEFORE",
  afterLabel: "AFTER",
  before,
  after,
  beforePct: 12,
  afterPct: 88,
});

test("a metric needs both ends of the comparison", () => {
  assert.equal(hasMetric(metric("12%", "88%")), true);
  assert.equal(hasMetric(metric("", "88%")), false);
  assert.equal(hasMetric(metric("12%", "")), false);
  assert.equal(hasMetric(metric("  ", "  ")), false);
  assert.equal(hasMetric(null), false);
});

test("stat tiles count as figures on their own", () => {
  assert.equal(hasFigures({ metric: metric("", ""), stats: [{ value: "97%" }] }), true);
  assert.equal(hasFigures({ metric: metric("12%", "88%"), stats: [] }), true);
  assert.equal(hasFigures({ metric: metric("", ""), stats: [] }), false);
  assert.equal(hasFigures({}), false);
});

test("a case study with no figures cannot claim reconciliation", () => {
  // The exact shape of the entry that exposed this: created in the console,
  // published, no stats row and no before/after — and the public page still
  // said every figure above had been reconciled.
  assert.equal(canClaimReconciliation({ metric: metric("", ""), stats: [] }), false);
});

test("an unconfirmed case study cannot claim reconciliation either", () => {
  // The console calls these "my construction rather than fact". The page must
  // not outrank the console on the same numbers.
  assert.equal(
    canClaimReconciliation({
      metric: metric("12%", "88%"),
      stats: [{ value: "97%" }],
      needsConfirmation: true,
    }),
    false,
  );
});

test("figures plus a confirmed flag is the one case that may claim it", () => {
  assert.equal(
    canClaimReconciliation({ metric: metric("12%", "88%"), stats: [{ value: "97%" }] }),
    true,
  );
});
