import assert from "node:assert/strict";
import { test } from "node:test";
// The .ts extension is required by Node's own resolver when it strips types.
// tsconfig sets allowImportingTsExtensions so tsc accepts it too.
import { attributionFrom, deviceTypeFrom, parseEnvelope } from "./collector.ts";

/**
 * Run with `npm test` (node --test). No test framework is installed and none
 * is needed — Node ships one, and the brief said to ask before adding a
 * dependency.
 *
 * These cover the parts of the collector that decide what gets stored. The
 * database write is not covered here: it needs a service role key and a live
 * project, and a test that needs both is an integration test pretending to be
 * a unit test.
 */

test("parseEnvelope rejects anything without a usable event name", () => {
  assert.equal(parseEnvelope(null), null);
  assert.equal(parseEnvelope({}), null);
  assert.equal(parseEnvelope({ event_name: "Book Call", event_id: "x" }), null);
  assert.equal(parseEnvelope({ event_name: "book_call", event_id: "" }), null);
  // Leading digit, uppercase and dashes are all out: names are snake_case.
  assert.equal(parseEnvelope({ event_name: "1book", event_id: "x" }), null);
  assert.equal(parseEnvelope({ event_name: "book-call", event_id: "x" }), null);
});

test("parseEnvelope keeps a well-formed event", () => {
  const envelope = parseEnvelope({
    event_name: "book_call_click",
    event_id: "abc-123",
    occurred_at: "2026-08-13T10:00:00.000Z",
    page_path: "/?utm_source=google",
    referrer: "https://www.google.com/",
    params: { placement: "hero", position: 2, first: true, missing: null },
    consent: { analytics_storage: "granted", ad_storage: "denied" },
  });

  assert.ok(envelope);
  assert.equal(envelope.event_name, "book_call_click");
  assert.equal(envelope.occurred_at, "2026-08-13T10:00:00.000Z");
  assert.deepEqual(envelope.params, {
    placement: "hero",
    position: 2,
    first: true,
    missing: null,
  });
  assert.equal(envelope.consent.analytics_storage, "granted");
});

test("parseEnvelope drops junk instead of storing it", () => {
  const envelope = parseEnvelope({
    event_name: "page_view",
    event_id: "e1",
    params: {
      ok: "kept",
      "Bad Key": "dropped",
      nested: { a: 1 },
      infinite: Number.POSITIVE_INFINITY,
    },
    consent: { analytics_storage: "maybe", ad_storage: "granted" },
  });

  assert.ok(envelope);
  assert.deepEqual(envelope.params, { ok: "kept" });
  // "maybe" is not a consent value, so it is not recorded as one.
  assert.deepEqual(envelope.consent, { ad_storage: "granted" });
});

test("parseEnvelope caps sizes so one POST cannot write a megabyte", () => {
  const params: Record<string, string> = {};
  for (let i = 0; i < 100; i++) params[`k${i}`] = "x".repeat(2000);

  const envelope = parseEnvelope({ event_name: "page_view", event_id: "e", params });

  assert.ok(envelope);
  assert.equal(Object.keys(envelope.params).length, 25);
  assert.equal(String(envelope.params.k0).length, 512);
});

test("parseEnvelope falls back to now on an unusable timestamp", () => {
  const envelope = parseEnvelope({
    event_name: "page_view",
    event_id: "e",
    occurred_at: "not a date",
  });

  assert.ok(envelope);
  assert.ok(!Number.isNaN(new Date(envelope.occurred_at).getTime()));
});

test("UTM parameters beat the referrer", () => {
  const a = attributionFrom(
    "/?utm_source=newsletter&utm_medium=email&utm_campaign=aug",
    "https://www.google.com/",
  );
  assert.equal(a.source, "newsletter");
  assert.equal(a.medium, "email");
  assert.equal(a.campaign, "aug");
});

test("a click id names the source even with no utm_source", () => {
  const google = attributionFrom("/?gclid=EAIaIQ", null);
  assert.equal(google.source, "google");
  assert.equal(google.medium, "cpc");
  assert.equal(google.gclid, "EAIaIQ");

  const meta = attributionFrom("/?fbclid=IwAR", null);
  assert.equal(meta.source, "facebook");
  assert.equal(meta.medium, "paid_social");
});

test("referrers are classified, and www is stripped", () => {
  assert.equal(attributionFrom("/", "https://www.google.com/search?q=ga4").medium, "organic");
  assert.equal(attributionFrom("/", "https://www.google.com/").source, "google.com");
  assert.equal(attributionFrom("/", "https://linkedin.com/feed").medium, "social");
  assert.equal(attributionFrom("/", "https://some-blog.dev/post").medium, "referral");
});

test("no source anywhere is direct, not missing", () => {
  const a = attributionFrom("/", null);
  assert.equal(a.source, "direct");
  assert.equal(a.medium, "none");
});

test("a malformed referrer does not invent a source", () => {
  const a = attributionFrom("/", "not-a-url");
  assert.equal(a.source, "direct");
});

test("device types, with bots kept apart", () => {
  assert.equal(deviceTypeFrom(""), "unknown");
  assert.equal(
    deviceTypeFrom("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"),
    "bot",
  );
  assert.equal(
    deviceTypeFrom("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148"),
    "mobile",
  );
  assert.equal(deviceTypeFrom("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)"), "tablet");
  assert.equal(
    deviceTypeFrom("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0"),
    "desktop",
  );
  // Android without "mobile" is a tablet — the one UA rule worth encoding.
  assert.equal(deviceTypeFrom("Mozilla/5.0 (Linux; Android 13; SM-X200)"), "tablet");
});
