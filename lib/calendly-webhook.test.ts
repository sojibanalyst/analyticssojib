import assert from "node:assert/strict";
import { test } from "node:test";
import { createHmac } from "node:crypto";
import {
  calendlyEventName,
  inviteeFromPayload,
  verifyCalendlySignature,
} from "./calendly-webhook.ts";

const KEY = "test-signing-key";
const body = JSON.stringify({ event: "invitee.created", payload: { uri: "u", email: "a@b.c" } });

const sign = (raw: string, t: number, key = KEY) =>
  `t=${t},v1=${createHmac("sha256", key).update(`${t}.${raw}`).digest("hex")}`;

test("a correctly signed webhook is accepted", () => {
  const now = new Date();
  const t = Math.floor(now.getTime() / 1000);
  assert.deepEqual(verifyCalendlySignature(sign(body, t), body, KEY, now), { ok: true });
});

test("an endpoint that creates leads refuses everything unsigned", () => {
  const now = new Date();
  const t = Math.floor(now.getTime() / 1000);
  // No header at all.
  assert.equal(verifyCalendlySignature(null, body, KEY, now).ok, false);
  // Signed with the wrong key — the case that matters, because anyone can POST.
  assert.equal(verifyCalendlySignature(sign(body, t, "wrong"), body, KEY, now).ok, false);
  // Right key, tampered body.
  assert.equal(verifyCalendlySignature(sign(body, t), body + " ", KEY, now).ok, false);
  // No signing key configured is a refusal, never an allow-by-default.
  assert.equal(verifyCalendlySignature(sign(body, t), body, "", now).ok, false);
  assert.equal(verifyCalendlySignature("garbage", body, KEY, now).ok, false);
});

test("a replayed request outside the window is refused", () => {
  const now = new Date();
  const old = Math.floor(now.getTime() / 1000) - 3600;
  const verdict = verifyCalendlySignature(sign(body, old), body, KEY, now);
  assert.equal(verdict.ok, false);
  assert.match(verdict.ok === false ? verdict.reason : "", /timestamp/i);
});

test("the invitee, the reference and the answers are read defensively", () => {
  const payload = {
    event: "invitee.created",
    payload: {
      uri: "https://api.calendly.com/scheduled_events/EV/invitees/IN",
      email: "  Booker@Example.com ",
      name: " A Booker ",
      created_at: "2026-08-22T10:00:00.000Z",
      scheduled_event: { uri: "https://api.calendly.com/scheduled_events/EV", start_time: "2026-08-23T09:00:00.000Z" },
      questions_and_answers: [
        { question: "What is broken?", answer: "GA4 purchases" },
        { question: "", answer: "dropped, no question" },
      ],
      tracking: { utm_source: "zzcheck", utm_content: "abc123def456ghjk" },
    },
  };

  const invitee = inviteeFromPayload(payload);
  assert.ok(invitee);
  assert.equal(calendlyEventName(payload), "invitee.created");
  assert.equal(invitee.email, "booker@example.com", "lowercased and trimmed");
  assert.equal(invitee.name, "A Booker");
  assert.equal(invitee.ref, "abc123def456ghjk");
  assert.equal(invitee.bookedAt, "2026-08-23T09:00:00.000Z");
  assert.deepEqual(invitee.answers, { "What is broken?": "GA4 purchases" });
});

test("a payload with no invitee uri or email is not a booking", () => {
  assert.equal(inviteeFromPayload({ payload: { email: "a@b.c" } }), null);
  assert.equal(inviteeFromPayload({ payload: { uri: "u" } }), null);
  assert.equal(inviteeFromPayload(null), null);
  assert.equal(inviteeFromPayload("nonsense"), null);
});

test("a booking with no reference still parses — it is recorded as unknown", () => {
  // Somebody shared the Calendly link directly. That is a real booking with no
  // attribution, and it must never be filed as direct.
  const invitee = inviteeFromPayload({
    event: "invitee.created",
    payload: { uri: "u", email: "a@b.c", tracking: {} },
  });
  assert.ok(invitee);
  assert.equal(invitee.ref, null);
});
