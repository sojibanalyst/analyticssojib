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
