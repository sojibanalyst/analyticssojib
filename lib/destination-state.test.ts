import assert from "node:assert/strict";
import { test } from "node:test";
import { destinationState, missingFor } from "./destination-state.ts";

const ga4 = (over: Partial<Parameters<typeof destinationState>[0]> = {}) => ({
  key: "ga4",
  enabled: false,
  config: { measurement_id: "G-ABC1234" } as Record<string, unknown>,
  hasSecret: true,
  ...over,
});

test("the three states, as the card will render them", () => {
  assert.equal(destinationState(ga4({ hasSecret: false })), "not_set_up");
  assert.equal(destinationState(ga4()), "ready");
  assert.equal(destinationState(ga4({ enabled: true })), "live");
});

test("a missing public identifier is not set up, even with a credential", () => {
  assert.equal(destinationState(ga4({ config: {} })), "not_set_up");
  assert.equal(destinationState(ga4({ config: { measurement_id: "   " } })), "not_set_up");
});

test("enabling an incomplete destination does not make it live", () => {
  // The switch is not the state. Flipping it on a destination with no
  // credential must not produce a green pill.
  assert.equal(destinationState(ga4({ hasSecret: false, enabled: true })), "not_set_up");
});

test("a credential from the environment counts", () => {
  // hasSecret is "a credential exists", not "a credential exists in the
  // database" — an env fallback is just as usable at send time.
  assert.equal(destinationState(ga4({ hasSecret: true })), "ready");
});

test("sGTM needs no secret, because it declares none", () => {
  const sgtm = {
    key: "sgtm",
    enabled: true,
    config: { endpoint: "https://sgtm.example.com" },
    hasSecret: false,
  };
  assert.equal(destinationState(sgtm), "live");
});

test("an unknown destination is never live", () => {
  assert.equal(
    destinationState({ key: "not_a_destination", enabled: true, config: {}, hasSecret: true }),
    "not_set_up",
  );
});

test("the card can say what is missing, not just refuse", () => {
  assert.deepEqual(missingFor(ga4({ hasSecret: false, config: {} })), [
    "Measurement ID",
    "API secret",
  ]);
  assert.deepEqual(missingFor(ga4()), []);
});
