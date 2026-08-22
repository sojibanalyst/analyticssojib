/**
 * The rule that decides whether a submission may be called successful.
 *
 * A lead was lost on the live site, and the visitor was told "Thanks — I'll
 * reply personally, usually within a day." Nothing looked broken to them and
 * nothing looked broken to me; the row simply was not there. That is the worst
 * failure mode this form has, because every other one announces itself.
 *
 * So the rule is not "the call did not error". It is "the database handed back
 * the id of the row it wrote". submit_lead returns the new lead's uuid, and an
 * absent, empty or malformed one means no row exists — whatever the transport
 * said about it.
 *
 * Pure, exported and tested, because the one thing that must never regress is
 * the ability to say "sent" without a row.
 */

/** RFC 4122 shape. Anything else did not come from gen_random_uuid(). */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The lead id, or null.
 *
 * null is the instruction to tell the visitor it did NOT save. It is never the
 * instruction to say nothing, and it is never the instruction to say thanks.
 */
export function leadIdFrom(data: unknown): string | null {
  if (typeof data !== "string") return null;
  const trimmed = data.trim();
  return UUID.test(trimmed) ? trimmed : null;
}

/**
 * Whether a result may be reported to a visitor as sent.
 *
 * Deliberately takes the same two things the action has — the error and the
 * returned data — so the test can assert the combination that caused the bug:
 * no error, no id, and the old code said "sent".
 */
export function mayReportSent(error: unknown, data: unknown): boolean {
  if (error) return false;
  return leadIdFrom(data) !== null;
}
