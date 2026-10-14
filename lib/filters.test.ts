import assert from "node:assert/strict";
import { test } from "node:test";

import { CASE_FILTERS, REVIEW_FILTERS, groupsOf } from "./filters.ts";

test("a Shopify case on server-side GTM is in both groups", () => {
  assert.deepEqual(groupsOf("CASE_007 / SHOPIFY / UK SGTM META CAPI", CASE_FILTERS), ["Shopify", "Server-side"]);
});

test("a review is grouped by the services it names", () => {
  assert.deepEqual(groupsOf("John S. · GA4, GTM, Google Ads + GoHighLevel", REVIEW_FILTERS), [
    "GTM",
    "GA4",
    "Google Ads",
  ]);
  assert.deepEqual(groupsOf("Jennifer K. · Shopify tracking audit", REVIEW_FILTERS), ["Audits"]);
});

test("a word inside another word is not a match", () => {
  assert.deepEqual(groupsOf("Metamorphosis studio", REVIEW_FILTERS), []);
});
