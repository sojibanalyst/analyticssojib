import assert from "node:assert/strict";
import { test } from "node:test";
import { redactSecrets } from "./redact.ts";

/**
 * The leak these guard against is specific: GA4's Measurement Protocol takes
 * the api_secret as a query parameter, so any code that logs a failed request
 * URL writes the credential to disk.
 */

test("a GA4 request URL loses its api_secret and keeps its measurement_id", () => {
  const url =
    "POST https://www.google-analytics.com/mp/collect?measurement_id=G-ABC1234&api_secret=zX9pQr7TvLmNbHgF failed 401";
  const out = redactSecrets(url);

  assert.ok(!out.includes("zX9pQr7TvLmNbHgF"), "the secret must be gone");
  // The measurement id is not a secret and is the useful half of the message.
  assert.ok(out.includes("measurement_id=G-ABC1234"));
  // A tail is kept so two different bad credentials are distinguishable.
  assert.match(out, /api_secret=\[REDACTED…bHgF\]/);
});

test("the other platforms' token parameters go too", () => {
  for (const key of ["access_token", "refresh_token", "developer_token", "client_secret"]) {
    const out = redactSecrets(`https://api.example.com/v1/events?${key}=SUPERSECRETTOKEN123`);
    assert.ok(!out.includes("SUPERSECRETTOKEN123"), `${key} must be redacted`);
  }
});

test("a known secret is removed even with no key in front of it", () => {
  const secret = "abcdefghijklmnop";
  const out = redactSecrets(`upstream said: bad credential ${secret}`, secret);
  assert.ok(!out.includes(secret));
  assert.match(out, /\[REDACTED\]/);
});

test("quoted JSON values are handled", () => {
  // Most API errors arrive as a JSON body, not a query string. The first
  // version of the pattern matched only query strings and silently missed
  // every one of these.
  const out = redactSecrets('{"api_secret":"zX9pQr7TvLmNbHgF","ok":false}');
  assert.ok(!out.includes("zX9pQr7TvLmNbHgF"));
  // The rest of the payload survives, or the error stops being diagnostic.
  assert.ok(out.includes('"ok":false'));
});

test("a short literal is not used as a needle", () => {
  // Redacting on a 4-character string would blank out unrelated words and
  // make the error message useless.
  const out = redactSecrets("connection refused", "abc");
  assert.equal(out, "connection refused");
});

test("text with nothing sensitive is returned unchanged", () => {
  const message = "Network timeout after 5000ms";
  assert.equal(redactSecrets(message), message);
});
