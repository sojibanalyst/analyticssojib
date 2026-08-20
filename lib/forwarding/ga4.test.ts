import assert from "node:assert/strict";
import { test } from "node:test";
import { ga4Adapter } from "./ga4.ts";
import type { ForwardEvent } from "./types.ts";

const config = { measurement_id: "G-4XKQ7P2M9B" };

const event = (over: Partial<ForwardEvent> = {}): ForwardEvent => ({
  eventId: "11111111-2222-3333-4444-555555555555",
  eventName: "generate_lead",
  occurredAt: new Date().toISOString(),
  clientId: "1900831477.1787245851",
  sessionId: "1787245851",
  pagePath: "/#contact",
  params: { form: "contact" },
  ...over,
});

test("page_view is refused by name, with the double-count as the reason", () => {
  // The whole file exists for this line. GA4 does not deduplicate by event_id,
  // and page_view is both the highest-volume event and the one already sent
  // from the browser.
  const verdict = ga4Adapter.canHandle(event({ eventName: "page_view" }), config);
  assert.equal(verdict.ok, false);
  assert.match(verdict.ok === false ? verdict.reason : "", /never forwarded|counted/i);
});

test("only allowlisted events pass, whatever else arrives", () => {
  for (const name of ["book_call_click", "scroll_75", "purchase", "consent_update"]) {
    assert.equal(ga4Adapter.canHandle(event({ eventName: name }), config).ok, false, name);
  }
  assert.equal(ga4Adapter.canHandle(event(), config).ok, true);
});

test("no client id means no send, rather than a fabricated user", () => {
  const verdict = ga4Adapter.canHandle(event({ clientId: null }), config);
  assert.equal(verdict.ok, false);
  assert.match(verdict.ok === false ? verdict.reason : "", /fabricated|_ga cookie/i);
});

test("no measurement id means no send", () => {
  assert.equal(ga4Adapter.canHandle(event(), {}).ok, false);
});

test("GA4's 72-hour window is enforced before the request, not by GA4", () => {
  const old = new Date(Date.now() - 73 * 3600 * 1000).toISOString();
  const verdict = ga4Adapter.canHandle(event({ occurredAt: old }), config);
  assert.equal(verdict.ok, false);
  assert.match(verdict.ok === false ? verdict.reason : "", /72h/);

  const fresh = new Date(Date.now() - 71 * 3600 * 1000).toISOString();
  assert.equal(ga4Adapter.canHandle(event({ occurredAt: fresh }), config).ok, true);
});

test("the payload carries the four things GA4 needs to attribute the hit", () => {
  const payload = ga4Adapter.transform(event(), config) as {
    client_id: string;
    timestamp_micros: string;
    events: { name: string; params: Record<string, unknown> }[];
  };

  assert.equal(payload.client_id, "1900831477.1787245851");
  // Microseconds, not milliseconds — a factor of 1000 out lands the event in
  // 1970 and GA4 drops it for being outside the window.
  assert.equal(payload.timestamp_micros.length, String(Date.now()).length + 3);
  assert.equal(payload.events[0].name, "generate_lead");
  // Without engagement_time_msec the session shows zero engaged time.
  assert.equal(payload.events[0].params.engagement_time_msec, 1);
  assert.equal(payload.events[0].params.session_id, "1787245851");
  assert.equal(payload.events[0].params.event_id, "11111111-2222-3333-4444-555555555555");
  assert.equal(payload.events[0].params.form, "contact");
});

test("a missing session id is omitted rather than invented", () => {
  const payload = ga4Adapter.transform(event({ sessionId: null }), config) as {
    events: { params: Record<string, unknown> }[];
  };
  assert.equal("session_id" in payload.events[0].params, false);
});
