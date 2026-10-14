/**
 * The groups the filter chips on /case-studies and /reviews sort things into.
 *
 * Matched against text the item already has (a case study's code and tags, a
 * review's attribution and words), so nothing is tagged by hand and a new
 * item lands in the right groups by itself. A chip is only shown when at
 * least one item matches it; see FilterList.
 */
export type FilterRule = { label: string; match: RegExp };

export const CASE_FILTERS: FilterRule[] = [
  { label: "Shopify", match: /shopify/i },
  { label: "WooCommerce", match: /woocommerce|wordpress/i },
  { label: "Lead gen", match: /lead|crm|form/i },
  { label: "Server-side", match: /sgtm|server[- ]side|stape|capi/i },
];

export const REVIEW_FILTERS: FilterRule[] = [
  { label: "GTM", match: /\bgtm\b|tag manager/i },
  { label: "GA4", match: /\bga4\b|google analytics/i },
  { label: "Google Ads", match: /google ads/i },
  { label: "Meta", match: /\bmeta\b|pixel|capi|facebook/i },
  { label: "Server-side", match: /server[- ]side|sgtm|stape/i },
  { label: "Audits", match: /audit/i },
];

/** The labels of every rule the text matches. */
export function groupsOf(text: string, rules: FilterRule[]): string[] {
  return rules.filter((rule) => rule.match.test(text)).map((rule) => rule.label);
}
