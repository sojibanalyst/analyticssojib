import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clientIdFromGaCookie,
  findStreamCookie,
  sessionIdFromGaCookie,
} from "./ga-cookies.ts";

test("client id is the last two segments, not the whole cookie", () => {
  // Read from a live GA4 site while writing this.
  assert.equal(clientIdFromGaCookie("GA1.1.1900831477.1787245851"), "1900831477.1787245851");
  // Deeper domain counters change the middle, never the last two.
  assert.equal(clientIdFromGaCookie("GA1.2.1234567890.1712345678"), "1234567890.1712345678");
  assert.equal(clientIdFromGaCookie("GA1.3.9.9"), "9.9");
});

test("a client id that is not two numbers is no client id", () => {
  assert.equal(clientIdFromGaCookie(""), null);
  assert.equal(clientIdFromGaCookie(null), null);
  assert.equal(clientIdFromGaCookie("GA1.1.1900831477"), null);
  assert.equal(clientIdFromGaCookie("GA1.1.abc.1787245851"), null);
  // Better no user than a fabricated one.
  assert.equal(clientIdFromGaCookie("nonsense"), null);
});

test("session id parses the GS2 dollar format that GA4 writes today", () => {
  assert.equal(
    sessionIdFromGaCookie("GS2.1.s1787245851$o1$g0$t1787245851$j60$l0$h0"),
    "1787245851",
  );
});

test("session id still parses the legacy GS1 dot format", () => {
  assert.equal(sessionIdFromGaCookie("GS1.1.1787245851.1.1.1787245890.0.0.0"), "1787245851");
});

test("an unrecognised session format returns null rather than a guess", () => {
  // The format has already changed once. When it changes again, no session id
  // is a recoverable loss; somebody else's session id is not.
  assert.equal(sessionIdFromGaCookie("GS3.1.x=1787245851;o=1"), null);
  assert.equal(sessionIdFromGaCookie("GS2.1.o1$g0"), null);
  assert.equal(sessionIdFromGaCookie(""), null);
  assert.equal(sessionIdFromGaCookie(null), null);
});

test("the stream cookie is chosen by measurement id when there is more than one", () => {
  const jar = [
    { name: "_ga", value: "GA1.1.1.1" },
    { name: "_ga_CXX395KXNG", value: "GS2.1.s111$o1" },
    { name: "_ga_OTHER1234", value: "GS2.1.s222$o1" },
  ];
  assert.equal(findStreamCookie(jar, "G-CXX395KXNG"), "GS2.1.s111$o1");
  // Two streams and nothing to choose by: none, rather than the wrong one.
  assert.equal(findStreamCookie(jar, null), null);
});

test("a single stream cookie is used even with no measurement id", () => {
  const jar = [
    { name: "_ga", value: "GA1.1.1.1" },
    { name: "_ga_CXX395KXNG", value: "GS2.1.s111$o1" },
  ];
  assert.equal(findStreamCookie(jar, null), "GS2.1.s111$o1");
  assert.equal(findStreamCookie([{ name: "_ga", value: "x" }], "G-ABC"), null);
});
