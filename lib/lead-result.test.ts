import assert from "node:assert/strict";
import { test } from "node:test";
import { leadIdFrom, mayReportSent } from "./lead-result.ts";

/**
 * The test the user asked for by name: it fails if a lead insert can report
 * success without a row existing.
 */
test("success is impossible without a row id, even with no error", () => {
  // This is the exact combination that lost a real enquiry: the call did not
  // error, no row came back, and the visitor was told it had been sent.
  assert.equal(mayReportSent(null, null), false, "no error and no id is NOT sent");
  assert.equal(mayReportSent(null, undefined), false);
  assert.equal(mayReportSent(null, ""), false);
  assert.equal(mayReportSent(null, "   "), false);
  // A truthy non-uuid is the sneakiest version: it looks like data.
  assert.equal(mayReportSent(null, "ok"), false);
  assert.equal(mayReportSent(null, true), false);
  assert.equal(mayReportSent(null, 12345), false);
  assert.equal(mayReportSent(null, {}), false);
  assert.equal(mayReportSent(null, []), false);
});

test("an error is never success, whatever came back with it", () => {
  assert.equal(mayReportSent(new Error("boom"), "b37bb65d-e1e1-4f10-b5cd-aa8e462afe1d"), false);
  assert.equal(mayReportSent({ message: "too_soon" }, null), false);
});

test("a real uuid from the database is the only thing that counts as sent", () => {
  const id = "c4dccdf6-e143-4224-9ada-6108e409a0f5";
  assert.equal(mayReportSent(null, id), true);
  assert.equal(leadIdFrom(id), id);
  assert.equal(leadIdFrom(` ${id} `), id, "whitespace is trimmed, not rejected");
});

test("a nearly-right id is still no id", () => {
  // Truncated, wrong shape, or something that merely contains a uuid.
  assert.equal(leadIdFrom("c4dccdf6-e143-4224-9ada"), null);
  assert.equal(leadIdFrom("c4dccdf6e1434224 9ada6108e409a0f5"), null);
  assert.equal(leadIdFrom("id=c4dccdf6-e143-4224-9ada-6108e409a0f5"), null);
});
