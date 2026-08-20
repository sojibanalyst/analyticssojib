import assert from "node:assert/strict";
import { test } from "node:test";
import { finishBlockedReason, toParagraphs } from "./post-body.ts";

test("blank lines separate paragraphs, single newlines do not", () => {
  assert.deepEqual(toParagraphs("One line\nwrapped here.\n\nSecond para."), [
    "One line wrapped here.",
    "Second para.",
  ]);
});

test("a body that renders as nothing counts as empty", () => {
  // Each of these is what stops a post being marked finished. The last two
  // matter most: they look like content in a textarea and render as nothing.
  assert.deepEqual(toParagraphs(""), []);
  assert.deepEqual(toParagraphs("   "), []);
  assert.deepEqual(toParagraphs("\n\n\n"), []);
  assert.deepEqual(toParagraphs("  \n \n\t\n  "), []);
});

test("one real paragraph is enough to be finishable", () => {
  assert.equal(toParagraphs("A single sentence.").length, 1);
});

test("an empty post cannot be marked finished, and the reason says why", () => {
  const reason = finishBlockedReason(false, toParagraphs("   \n\n  "));
  assert.ok(reason);
  assert.match(reason, /no body|cannot be marked finished/i);
  assert.match(reason, /unfinished/i, "it must say what to do instead");
});

test("an empty post may stay unfinished, and a written one may be finished", () => {
  assert.equal(finishBlockedReason(true, []), null);
  assert.equal(finishBlockedReason(false, toParagraphs("A real paragraph.")), null);
});
