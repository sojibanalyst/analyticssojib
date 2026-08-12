/**
 * Blog posts.
 *
 * SINCE P2 THE `posts` ARRAY BELOW IS NOT READ BY THE SITE. Posts live in
 * Supabase and the pages read them through lib/content. This array is the
 * input to scripts/import-content.mjs, which is what put them there — editing
 * it changes nothing until that script is re-run with --force.
 *
 * `blog` (the section's own labels and notices) IS still live and read from
 * here.
 *
 * Unchanged either way: an unfinished post still renders at its URL, marked
 * DRAFT, kept out of the sitemap and set to noindex. In the database that is
 * `is_draft`; `status` decides whether the URL exists at all.
 */

export type Post = {
  slug: string;
  /** Small kicker on the card, e.g. "SERVER-SIDE" */
  topic: string;
  readingTime: string;
  title: string;
  /** One-sentence summary — used on the card, in <meta description> and OG. */
  summary: string;
  /** ISO date. Set when the post goes live. */
  date: string;
  draft: boolean;
  /** Body paragraphs. Plain strings; each renders as its own <p>. */
  body: string[];
};

export const posts: Post[] = [
  {
    slug: "prove-ga4-purchase-count-is-wrong",
    topic: "SERVER-SIDE",
    readingTime: "9 MIN",
    title: "How to prove your GA4 purchase count is wrong in 20 minutes",
    summary:
      "A reconciliation you can run yourself: pull GA4 purchases for a fixed window, pull the same window from your order table, and compare them line by line.",
    date: "",
    draft: true,
    body: [],
  },
  {
    slug: "event-id-deduplication-pixel-and-capi",
    topic: "META CAPI",
    readingTime: "12 MIN",
    title: "Deduplication is not optional: event IDs across pixel and CAPI",
    summary:
      "Why running the Meta pixel and the Conversions API together without a shared event ID inflates every number you report, and how to set the ID correctly.",
    date: "",
    draft: true,
    body: [],
  },
  {
    slug: "consent-mode-v2-without-losing-data",
    topic: "CONSENT",
    readingTime: "7 MIN",
    title: "Consent Mode v2 without quietly deleting a third of your data",
    summary:
      "What deny-by-default actually does to your conversions, and how to configure Consent Mode v2 so you keep modelled conversions instead of losing the signal outright.",
    date: "",
    draft: true,
    body: [],
  },
];

// `publishedPosts` and `getPost` used to live here. They are gone rather than
// left unused: lib/content exports functions with the same names, and two
// `getPost`s in one codebase — one reading the database, one reading this file
// — is a bug waiting for an autocomplete to pick the wrong import.

export const blog = {
  eyebrow: "07 / NOTES",
  title: "Writing",
  /** Shown on a post page that has no body yet. */
  draftNotice:
    "This one is still being written. The outline is set; the post goes up when it is finished rather than half-done.",
  emptyBody:
    "No body text yet — replace `body` in content/posts.ts to publish this post.",
} as const;
