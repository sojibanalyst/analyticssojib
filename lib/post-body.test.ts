import assert from "node:assert/strict";
import { test } from "node:test";
import { toParagraphs } from "./post-body.ts";

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
