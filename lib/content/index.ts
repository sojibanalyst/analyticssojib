import "server-only";

import type {
  CaseShot,
  CaseStat,
  CaseStudy,
  Faq,
  Testimonial,
  WrittenReview,
} from "@/content/site";
import type { Post } from "@/content/posts";
import { contentClient, orThrow } from "./client";

/**
 * Reads the site's content out of Supabase and hands it back in exactly the
 * shapes content/*.ts used to export.
 *
 * That is deliberate. Every component keeps its current props and its current
 * JSX, so the before/after HTML diff has only one variable in it: where the
 * data came from. If a page renders differently after this change, the cause
 * is the data, not a rewrite — which is the only way that diff proves anything.
 *
 * The types still live in content/*.ts. They describe the site's content model
 * and are not owned by the database.
 */

/* -------------------------------------------------------------------------- */
/* Posts                                                                       */
/* -------------------------------------------------------------------------- */

export async function getPosts(): Promise<Post[]> {
  const rows = orThrow(
    "posts",
    await contentClient()
      .from("posts")
      .select("slug, topic, reading_time, title, summary, body, is_draft, published_at")
      .order("sort_order", { ascending: true }),
  );

  return rows.map((row) => ({
    slug: row.slug,
    topic: row.topic,
    readingTime: row.reading_time,
    title: row.title,
    summary: row.summary,
    // published_at is null while a post is unfinished; the type wants "".
    date: row.published_at ?? "",
    // is_draft, not status. `status` decides whether the URL exists at all
    // and is already applied by the RLS policy this client reads through — a
    // row that is not published never reaches here. See migration 010003.
    draft: row.is_draft,
    body: row.body,
  }));
}

export async function getPublishedPosts(): Promise<Post[]> {
  return (await getPosts()).filter((post) => !post.draft);
}

/**
 * One post, queried by slug rather than filtered out of the full list.
 *
 * The difference matters and was found by testing. Filtering a cached list
 * means a post created five seconds ago cannot be found until that list's
 * cache entry is dropped — so a brand-new URL 404s. A per-slug query has its
 * own cache key, so a slug nobody has asked for yet always misses the cache,
 * reaches the database and renders. Creating a post makes its URL work
 * immediately, by construction rather than by remembering to revalidate.
 */
export async function getPost(slug: string): Promise<Post | undefined> {
  const rows = orThrow(
    `post ${slug}`,
    await contentClient()
      .from("posts")
      .select("slug, topic, reading_time, title, summary, body, is_draft, published_at")
      .eq("slug", slug)
      .limit(1),
  );

  const row = rows[0];
  if (!row) return undefined;

  return {
    slug: row.slug,
    topic: row.topic,
    readingTime: row.reading_time,
    title: row.title,
    summary: row.summary,
    date: row.published_at ?? "",
    draft: row.is_draft,
    body: row.body,
  };
}

/* -------------------------------------------------------------------------- */
/* Case studies                                                                */
/* -------------------------------------------------------------------------- */

/** detail_sections is jsonb, so it arrives as Json and has to be narrowed. */
type DetailSection = { heading: string; paras: string[] };

function toDetailSections(value: unknown, slug: string): DetailSection[] {
  if (!Array.isArray(value)) {
    throw new Error(`Case study ${slug}: detail_sections is not an array.`);
  }
  return value.map((section, i) => {
    const s = section as Partial<DetailSection>;
    if (typeof s?.heading !== "string" || !Array.isArray(s?.paras)) {
      throw new Error(`Case study ${slug}: detail_sections[${i}] is malformed.`);
    }
    return { heading: s.heading, paras: s.paras as string[] };
  });
}

/** The columns both case-study reads select. Kept in one place so the list
 *  query and the by-slug query can never drift apart. */
const CASE_COLUMNS = `slug, code, status_label, title, body, tags, intro,
   metric_caption, metric_before_label, metric_after_label,
   metric_before, metric_after, metric_before_pct, metric_after_pct,
   detail_sections, needs_confirmation,
   case_study_stats (value, unit, label, sort_order),
   case_study_shots (storage_path, caption, alt_text, section, sort_order)`;

type CaseRow = {
  slug: string;
  code: string;
  status_label: string;
  title: string;
  body: string;
  tags: string[];
  intro: string;
  metric_caption: string | null;
  metric_before_label: string | null;
  metric_after_label: string | null;
  metric_before: string | null;
  metric_after: string | null;
  metric_before_pct: number | null;
  metric_after_pct: number | null;
  detail_sections: unknown;
  needs_confirmation: boolean;
  case_study_stats: { value: string; unit: string | null; label: string; sort_order: number }[];
  case_study_shots: {
    storage_path: string;
    caption: string;
    alt_text: string;
    section: string | null;
    sort_order: number;
  }[];
};

function toCaseStudy(row: CaseRow): CaseStudy {
  // Ordering a nested relation in the same query is not reliable across
  // PostgREST versions, so the children are sorted here where it is obvious.
  const stats: CaseStat[] = [...row.case_study_stats]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((s) => ({
      value: s.value,
      ...(s.unit ? { unit: s.unit } : {}),
      label: s.label,
    }));

  const screenshots: CaseShot[] = [...row.case_study_shots]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((s) => ({
      src: s.storage_path,
      alt: s.alt_text,
      caption: s.caption,
      section: s.section ?? "",
    }));

  return {
    slug: row.slug,
    code: row.code,
    status: row.status_label,
    title: row.title,
    body: row.body,
    tags: row.tags,
    metric: {
      caption: row.metric_caption ?? "",
      beforeLabel: row.metric_before_label ?? "",
      afterLabel: row.metric_after_label ?? "",
      before: row.metric_before ?? "",
      after: row.metric_after ?? "",
      beforePct: Number(row.metric_before_pct ?? 0),
      afterPct: Number(row.metric_after_pct ?? 0),
    },
    stats,
    screenshots,
    detail: {
      intro: row.intro,
      sections: toDetailSections(row.detail_sections, row.slug),
    },
    // Optional in the type: only set when true, so the object matches what
    // content/site.ts produced for cases that never had the flag.
    ...(row.needs_confirmation ? { needsConfirmation: true } : {}),
  };
}

export async function getCaseStudies(): Promise<CaseStudy[]> {
  const rows = orThrow(
    "case studies",
    await contentClient()
      .from("case_studies")
      .select(CASE_COLUMNS)
      .eq("status", "published")
      .order("sort_order", { ascending: true }),
  );

  return rows.map(toCaseStudy);
}

/** Same reasoning as getPost: queried by slug so a new one resolves at once. */
export async function getCaseStudy(slug: string): Promise<CaseStudy | undefined> {
  const rows = orThrow(
    `case study ${slug}`,
    await contentClient()
      .from("case_studies")
      .select(CASE_COLUMNS)
      .eq("slug", slug)
      .eq("status", "published")
      .limit(1),
  );

  return rows[0] ? toCaseStudy(rows[0]) : undefined;
}

/* -------------------------------------------------------------------------- */
/* Reviews                                                                     */
/* -------------------------------------------------------------------------- */

async function getReviewRows() {
  return orThrow(
    "reviews",
    await contentClient()
      .from("reviews")
      .select(
        `type, youtube_id, aspect_ratio, a11y_label, client_name, company,
         quote, pull_quote, attribution, is_placeholder, sort_order`,
      )
      .eq("published", true)
      .order("sort_order", { ascending: true }),
  );
}

export async function getVideoReviews(): Promise<Testimonial[]> {
  const rows = (await getReviewRows()).filter((row) => row.type === "video");

  return rows.map((row) => ({
    id: row.youtube_id ?? "",
    orientation: row.aspect_ratio ?? "landscape",
    label: row.a11y_label ?? "",
    // Every one of these is optional in the type and stays unset unless the
    // client actually agreed to be named or actually said the words.
    ...(row.client_name ? { name: row.client_name } : {}),
    ...(row.company ? { role: row.company } : {}),
    ...(row.quote ? { quote: row.quote } : {}),
    ...(row.pull_quote ? { title: row.pull_quote } : {}),
  }));
}

export async function getWrittenReviews(): Promise<WrittenReview[]> {
  const rows = (await getReviewRows()).filter((row) => row.type === "written");

  return rows.map((row) => ({
    // A placeholder's "quote" is a note to myself — "paste the client's own
    // words here, unedited" — so the public read does not carry it at all.
    // Not rendering it was not enough: the string still travelled to the
    // browser inside the RSC payload, where it is findable in page source by
    // anyone who looks, which is the same sentence appearing on the site by a
    // slower route.
    quote: row.is_placeholder ? "" : row.quote ?? "",
    attribution: row.attribution ?? "",
    // The flag is only present when it is true, and it is what stops a
    // placeholder being rendered as a real client's words.
    ...(row.is_placeholder ? { placeholder: true } : {}),
  }));
}

/* -------------------------------------------------------------------------- */
/* FAQs                                                                        */
/* -------------------------------------------------------------------------- */

export async function getFaqs(): Promise<Faq[]> {
  const rows = orThrow(
    "FAQs",
    await contentClient()
      .from("faqs")
      .select("question, answer")
      .eq("published", true)
      .order("sort_order", { ascending: true }),
  );

  return rows.map((row) => ({ q: row.question, a: row.answer }));
}
