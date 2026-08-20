/**
 * A post's body, as the page renders it.
 *
 * One paragraph per blank-line-separated block. Splitting on single newlines
 * would turn a wrapped sentence into three paragraphs, and not splitting at
 * all would render the whole post as one wall.
 *
 * Pulled out of the save action so the emptiness rule can be tested: whether a
 * post counts as having a body is what decides if it may be marked finished,
 * and "a textarea containing three blank lines" is exactly the input that
 * looks non-empty to a human and is empty to the renderer.
 */
export function toParagraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((para) => para.trim().replace(/\s*\n\s*/g, " "))
    .filter(Boolean);
}

/**
 * Whether a post may be marked finished, and why not when it may not.
 *
 * The rule, not just the check: finished means indexable, and an indexable
 * page whose entire text is a headline and a summary is thin content — one of
 * these measured 579 characters. Same principle the case studies screen
 * already states about numbers: a thing should not go live the second it
 * exists.
 *
 * Pure and exported so the rule itself is tested. The server action calls this
 * rather than repeating the condition, because a rule that lives inside a
 * function nobody can call without an admin session is a rule nobody can
 * check.
 */
export function finishBlockedReason(
  isDraft: boolean,
  paragraphs: string[],
): string | null {
  if (isDraft) return null;
  if (paragraphs.length > 0) return null;

  return (
    "This post has no body, so it cannot be marked finished — it would publish " +
    "as an indexable page with a headline and no article. Paste the post in, " +
    "or leave it ticked as unfinished."
  );
}
