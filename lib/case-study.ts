/**
 * What a case study can honestly claim about itself.
 *
 * Both of these exist because a case study created in the console with the
 * figures left blank still rendered as though it had them: an empty
 * before/after block on the card, and a footnote on the page promising that
 * "every figure above was reconciled against the client's own order data"
 * under a page with no figures above it at all.
 *
 * Structural parameter types rather than the CaseStudy import, so this stays
 * a plain module the test runner can load without pulling in content/site.ts.
 */

export type MetricLike = {
  caption: string;
  beforeLabel: string;
  afterLabel: string;
  before: string;
  after: string;
  beforePct: number;
  afterPct: number;
};

const filled = (value: string | null | undefined) => Boolean(value && value.trim());

/**
 * A before/after block is worth rendering only when both ENDS of the
 * comparison exist. One side alone is not a comparison, and the bars would
 * draw a change from nothing to something that never happened.
 *
 * The labels and the caption are not tested: a metric can be meaningful with
 * an unlabelled axis, and cannot be meaningful without its two values.
 */
export function hasMetric(metric: MetricLike | null | undefined): boolean {
  if (!metric) return false;
  return filled(metric.before) && filled(metric.after);
}

/**
 * Whether the page shows any number at all — the before/after pair, or the
 * stat tiles, or both.
 */
export function hasFigures(item: {
  metric?: MetricLike | null;
  stats?: unknown[] | null;
}): boolean {
  return hasMetric(item.metric) || (item.stats?.length ?? 0) > 0;
}

/**
 * Whether the reconciliation footnote may be shown.
 *
 * Two conditions, and the second is the one that matters. /admin/case-studies
 * marks a study as needing confirmation with the words "treat those numbers as
 * my construction rather than as fact". A public page cannot say those numbers
 * were reconciled with a client while the console says they are unverified —
 * that is not a display bug, it is the site claiming something the person who
 * runs it has explicitly said is not established.
 */
export function canClaimReconciliation(item: {
  metric?: MetricLike | null;
  stats?: unknown[] | null;
  needsConfirmation?: boolean;
}): boolean {
  return hasFigures(item) && !item.needsConfirmation;
}
