/**
 * Shapes shared by the console's content screens and the Server Actions that
 * save them. A plain module: a "use server" file may only export async
 * functions, so the types live here.
 */

export type ContentKind = "case-studies" | "portfolio" | "reviews" | "posts" | "faqs";

export const CONTENT_KINDS: ContentKind[] = ["case-studies", "portfolio", "reviews", "posts", "faqs"];

/** What an editor action reports: the saved id, or what is wrong and where. */
export type SaveResult =
  | { ok: true; id: string; message: string }
  | { ok: false; message: string; fields?: Record<string, string> };

export type CaseSection = { heading: string; paras: string[] };

/** The drafts each editor holds while you type. Plain JSON, sent as is. */
export type CaseStudyDraft = {
  title: string;
  code: string;
  intro: string;
  body: string;
  tags: string[];
  status: "published" | "draft";
  needs_confirmation: boolean;
  metric_caption: string;
  metric_before_label: string;
  metric_after_label: string;
  metric_before: string;
  metric_after: string;
  metric_before_pct: string;
  metric_after_pct: string;
  detail_sections: CaseSection[];
};

export type ProjectDraft = {
  title: string;
  description: string;
  skills: string[];
  client: string;
  role: string;
  url: string;
  video_id: string;
  featured: boolean;
  published: boolean;
};

export type ReviewDraft = {
  type: "written" | "video";
  quote: string;
  attribution: string;
  rating: string;
  youtube_id: string;
  client_name: string;
  company: string;
  a11y_label: string;
  aspect_ratio: "portrait" | "landscape";
  published: boolean;
};

export type PostDraft = {
  title: string;
  summary: string;
  topic: string;
  reading_time: string;
  body: string;
  status: "published" | "draft";
  is_draft: boolean;
};

export type FaqDraft = { question: string; answer: string; published: boolean };

export type Draft = CaseStudyDraft | ProjectDraft | ReviewDraft | PostDraft | FaqDraft;

/** The text a review quote may run to before the field warns. */
export const QUOTE_SOFT_LIMIT = 600;
