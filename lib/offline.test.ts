import assert from "node:assert/strict";
import { test } from "node:test";
import {
  daysBetween,
  evaluateLead,
  toGoogleAdsCsv,
  type LeadForUpload,
} from "./offline.ts";

const NOW = new Date("2026-08-13T00:00:00.000Z").getTime();

function lead(overrides: Partial<LeadForUpload> = {}): LeadForUpload {
  return {
    id: "lead-1",
    created_at: "2026-08-01T00:00:00.000Z",
    status: "won",
    value: 2400,
    currency: "USD",
    gclid: "GCL123",
    fbclid: null,
    ttclid: null,
    msclkid: null,
    consent: { ad_storage: "granted" },
    ...overrides,
  };
}

test("a won lead with a click id, a value and consent is eligible", () => {
  const row = evaluateLead(lead(), "google_ads", "USD", NOW);
  assert.equal(row.result, "eligible");
  assert.equal(row.reason, null);
  assert.equal(row.click_id, "GCL123");
});

test("every rejection carries a reason", () => {
  const cases: LeadForUpload[] = [
    lead({ status: "new" }),
    lead({ gclid: null }),
    lead({ consent: { ad_storage: "denied" } }),
    lead({ created_at: "2026-01-01T00:00:00.000Z" }),
    lead({ value: null }),
  ];

  for (const item of cases) {
    const row = evaluateLead(item, "google_ads", "USD", NOW);
    assert.equal(row.result, "ineligible");
    assert.ok(row.reason && row.reason.length > 20, "reason must say something useful");
  }
});

test("only booked and won count as conversions", () => {
  // Uploading "qualified" would teach the platform to optimise for people who
  // looked promising rather than people who paid.
  assert.equal(evaluateLead(lead({ status: "qualified" }), "google_ads", "USD", NOW).result, "ineligible");
  assert.equal(evaluateLead(lead({ status: "booked" }), "google_ads", "USD", NOW).result, "eligible");
  assert.equal(evaluateLead(lead({ status: "won" }), "google_ads", "USD", NOW).result, "eligible");
});

test("a declined visitor's click id is never uploaded", () => {
  const row = evaluateLead(lead({ consent: { ad_storage: "denied" } }), "google_ads", "USD", NOW);
  assert.equal(row.result, "ineligible");
  assert.match(row.reason ?? "", /declined ad storage/i);
});

test("the 90-day window is enforced, and the reason says how old", () => {
  const old = lead({ created_at: "2026-04-01T00:00:00.000Z" });
  const row = evaluateLead(old, "google_ads", "USD", NOW);
  assert.equal(row.result, "ineligible");
  assert.match(row.reason ?? "", /134 days old/);

  // Exactly 90 days still goes.
  const edge = lead({ created_at: new Date(NOW - 90 * 86_400_000).toISOString() });
  assert.equal(evaluateLead(edge, "google_ads", "USD", NOW).result, "eligible");
});

test("each destination looks for its own click id", () => {
  const metaOnly = lead({ gclid: null, fbclid: "FB123" });
  assert.equal(evaluateLead(metaOnly, "meta_capi", "USD", NOW).result, "eligible");
  assert.equal(evaluateLead(metaOnly, "google_ads", "USD", NOW).result, "ineligible");
});

test("currency falls back to the configured default", () => {
  const row = evaluateLead(lead({ currency: null }), "google_ads", "GBP", NOW);
  assert.equal(row.currency, "GBP");
});

test("the CSV carries only eligible rows, with ISO times", () => {
  const rows = [
    evaluateLead(lead(), "google_ads", "USD", NOW),
    evaluateLead(lead({ id: "lead-2", status: "lost" }), "google_ads", "USD", NOW),
  ];

  const csv = toGoogleAdsCsv(rows, "Booked call");
  const lines = csv.split("\r\n");

  assert.equal(lines.length, 2, "header plus one eligible row");
  assert.equal(lines[0], "Google Click ID,Conversion Name,Conversion Time,Conversion Value,Conversion Currency");
  assert.equal(lines[1], "GCL123,Booked call,2026-08-01T00:00:00.000Z,2400,USD");
});

test("a conversion name containing a comma is quoted, not left to break the file", () => {
  const csv = toGoogleAdsCsv([evaluateLead(lead(), "google_ads", "USD", NOW)], 'Booked, "call"');
  assert.match(csv, /"Booked, ""call"""/);
});

test("daysBetween counts whole days", () => {
  assert.equal(daysBetween("2026-08-01T00:00:00.000Z", NOW), 12);
});
