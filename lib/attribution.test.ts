import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isMeaningful,
  mergeTouch,
  parseAttribution,
  serialiseAttribution,
  touchFromRequest,
} from "./attribution.ts";

const req = (url: string, referrer: string | null = null) =>
  touchFromRequest(new URL(url), referrer, "analyticssojib.com");

test("utm parameters are read from the URL, not from the page", () => {
  const t = req("https://analyticssojib.com/?utm_source=newsletter&utm_medium=email&utm_campaign=aug&utm_term=ga4&utm_content=v2");
  assert.equal(t.source, "newsletter");
  assert.equal(t.medium, "email");
  assert.equal(t.campaign, "aug");
  assert.equal(t.term, "ga4");
  assert.equal(t.content, "v2");
  assert.equal(t.landing_page, "/?utm_source=newsletter&utm_medium=email&utm_campaign=aug&utm_term=ga4&utm_content=v2");
});

test("wbraid and gbraid are their own fields, never folded into gclid", () => {
  // Uploading a wbraid as a gclid is rejected by Google, and the failure looks
  // like the upload worked.
  const w = req("https://analyticssojib.com/?wbraid=abc123");
  assert.equal(w.wbraid, "abc123");
  assert.equal(w.gclid, null);
  assert.equal(w.source, "google");
  assert.equal(w.medium, "cpc");

  const g = req("https://analyticssojib.com/?gbraid=def456");
  assert.equal(g.gbraid, "def456");
  assert.equal(g.gclid, null);
  assert.equal(g.wbraid, null);
});

test("every click id maps to its platform", () => {
  assert.equal(req("https://analyticssojib.com/?gclid=x").source, "google");
  assert.equal(req("https://analyticssojib.com/?fbclid=x").source, "facebook");
  assert.equal(req("https://analyticssojib.com/?ttclid=x").source, "tiktok");
  assert.equal(req("https://analyticssojib.com/?msclkid=x").source, "bing");
  assert.equal(req("https://analyticssojib.com/?li_fat_id=x").source, "linkedin");
});

test("a referrer names the source only when it is somebody else's site", () => {
  const external = req("https://analyticssojib.com/", "https://www.google.com/search?q=ga4");
  assert.equal(external.source, "google.com");
  assert.equal(external.medium, "organic");

  // Internal navigation is not a new source. Treating it as one is how a
  // campaign gets overwritten on the visitor's second pageview.
  const internal = req("https://analyticssojib.com/blog", "https://analyticssojib.com/");
  assert.equal(internal.source, null);
  assert.equal(isMeaningful(internal), false);
});

test("first touch is never overwritten by a later campaign", () => {
  const first = req("https://analyticssojib.com/?utm_source=newsletter");
  const record = mergeTouch(null, first, "2026-08-20T10:00:00.000Z");
  assert.equal(record.first.source, "newsletter");
  assert.equal(record.status, "captured");

  const later = req("https://analyticssojib.com/?gclid=abc");
  const merged = mergeTouch(record, later, "2026-08-20T11:00:00.000Z");
  assert.equal(merged.first.source, "newsletter", "first touch must not move");
  assert.equal(merged.last.source, "google", "last touch is the one that closed it");
  assert.equal(merged.first_seen_at, "2026-08-20T10:00:00.000Z");
});

test("an internal pageview does not overwrite last touch", () => {
  const record = mergeTouch(null, req("https://analyticssojib.com/?gclid=abc"), "t0");
  const merged = mergeTouch(record, req("https://analyticssojib.com/blog", "https://analyticssojib.com/"), "t1");
  assert.equal(merged.last.gclid, "abc", "a plain second page is not a new touch");
});

test("direct and unknown are different answers", () => {
  // Seen, and carried nothing: direct.
  const direct = mergeTouch(null, req("https://analyticssojib.com/"), "t0");
  assert.equal(direct.status, "direct");
  // Never seen at all: unknown. Reporting this as direct would file a capture
  // failure as organic traffic.
  assert.equal(parseAttribution(null), null);
  assert.equal(parseAttribution("not json"), null);
});

test("a first visit that was direct upgrades when a campaign arrives", () => {
  const direct = mergeTouch(null, req("https://analyticssojib.com/"), "t0");
  const later = mergeTouch(direct, req("https://analyticssojib.com/?utm_source=li"), "t1");
  assert.equal(later.first.source, "li", "direct was the absence of an answer, not an answer");
  assert.equal(later.status, "captured");
});

test("the cookie round-trips", () => {
  const record = mergeTouch(null, req("https://analyticssojib.com/?gclid=abc&utm_campaign=brand"), "t0");
  const back = parseAttribution(serialiseAttribution(record));
  assert.ok(back);
  assert.equal(back.first.gclid, "abc");
  assert.equal(back.first.campaign, "brand");
  assert.equal(back.status, "captured");
});
