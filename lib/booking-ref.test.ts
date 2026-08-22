import assert from "node:assert/strict";
import { test } from "node:test";
import { isBookingRef, newBookingRef } from "./booking-ref.ts";

test("a reference is opaque, fixed length, and unguessable in practice", () => {
  const a = newBookingRef();
  const b = newBookingRef();
  assert.equal(a.length, 16);
  assert.notEqual(a, b);
  assert.match(a, /^[0-9bcdfghjkmnpqrstvwxz]+$/, "no vowels, so it cannot spell anything");
});

test("only our own shape is accepted back from utm_content", () => {
  // utm_content is public and anyone can put anything in it.
  assert.equal(isBookingRef(newBookingRef()), true);
  assert.equal(isBookingRef(""), false);
  assert.equal(isBookingRef(null), false);
  assert.equal(isBookingRef("short"), false);
  assert.equal(isBookingRef("a".repeat(400)), false);
  assert.equal(isBookingRef("ABC123DEF456GHJK"), false, "uppercase is not our alphabet");
  assert.equal(isBookingRef("abc123def456ghj'"), false);
});
