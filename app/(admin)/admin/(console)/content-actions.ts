"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { isAllowedEmail } from "@/lib/auth";
import { CONTENT_TAG } from "@/lib/content/client";
import { finishBlockedReason, toParagraphs } from "@/lib/post-body";
import { parseGtmSnippet } from "@/lib/gtm-snippet";
import { GTM_ID_PATTERN, SETTINGS_TAG } from "@/lib/settings";
import { createClient, getUser } from "@/lib/supabase/server";
import {
  ACTION_ERRORS,
  fail,
  ok,
  type ActionState,
} from "@/lib/action-state";
import { CONTENT_KINDS, type ContentKind, type SaveResult } from "@/lib/admin/editor";

/**
 * Editing published content from the console.
 *
 * Every one of these ends with revalidateTag(CONTENT_TAG). The public pages
 * are static and read Supabase through cached, tagged GETs — without this the
 * site would keep serving the old text for up to an hour after a save, and the
 * obvious conclusion would be that saving is broken.
 *
 * The allowlist is checked in each action because a Server Action is a POST
 * endpoint that can be called directly; the layout guard does not run for it.
 * RLS remains the layer that actually holds: these writes go through the
 * caller's own session.
 */

async function requireAdmin() {
  const user = await getUser();
  if (!isAllowedEmail(user?.email)) return null;
  return createClient();
}

export async function updateSettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await requireAdmin();
  if (!supabase) return fail(ACTION_ERRORS.notAllowed);

  // Validated here, not only via the input's pattern. A malformed container id
  // renders a snippet that silently never loads — the page looks instrumented
  // and is not, which is worse than having no container at all.
  const gtm = String(formData.get("gtm_container_id") ?? "").trim().toUpperCase();
  if (gtm && !GTM_ID_PATTERN.test(gtm)) {
    return fail("Container ID looks like GTM-XXXXXXX: capitals and digits after the hyphen.");
  }

  // The pasted <head> snippet: only <script> tags and comments, checked by the
  // same parser the site uses to render it, so what saves is what renders.
  const headCode = String(formData.get("gtm_head_code") ?? "").trim();
  if (headCode) {
    const parsed = parseGtmSnippet(headCode);
    if (!parsed.ok) return fail(`GTM head code: ${parsed.reason}`);
  }

  // The tracking lab's container: the same two checks, separately.
  const labGtm = String(formData.get("lab_gtm_container_id") ?? "").trim().toUpperCase();
  if (labGtm && !GTM_ID_PATTERN.test(labGtm)) {
    return fail("Lab container ID looks like GTM-XXXXXXX: capitals and digits after the hyphen.");
  }
  const labHeadCode = String(formData.get("lab_gtm_head_code") ?? "").trim();
  if (labHeadCode) {
    const parsed = parseGtmSnippet(labHeadCode);
    if (!parsed.ok) return fail(`Lab GTM head code: ${parsed.reason}`);
  }

  const { error } = await supabase
    .from("settings")
    .update({
      gtm_container_id: gtm || null,
      gtm_head_code: headCode || null,
      lab_gtm_container_id: labGtm || null,
      lab_gtm_head_code: labHeadCode || null,
      site_name: String(formData.get("site_name") ?? "").trim() || null,
      contact_email: String(formData.get("contact_email") ?? "").trim() || null,
      calendly_url: String(formData.get("calendly_url") ?? "").trim() || null,
      sgtm_endpoint: String(formData.get("sgtm_endpoint") ?? "").trim() || null,
      default_currency:
        String(formData.get("default_currency") ?? "").trim().toUpperCase().slice(0, 3) ||
        null,
    })
    .eq("id", true);

  if (error) return fail(error.message);

  // The GTM snippet on every public page reads through this tag. Dropping it
  // is what makes a container change take effect on the next request instead
  // of the next deploy — the whole point of moving the id out of the bundle.
  revalidateTag(SETTINGS_TAG, { expire: 0 });
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
  return ok("Settings saved.");
}

/**
 * Drops the cached content reads so the static pages pick the change up on
 * their next request, instead of an hour later.
 */
async function revalidateContent(): Promise<void> {
  // Next 16 changed revalidateTag to take a cache profile alongside the tag.
  // `{ expire: 0 }` is the unambiguous form: expire the entry now, rather
  // than naming a profile whose meaning could change under us.
  revalidateTag(CONTENT_TAG, { expire: 0 });
  revalidatePath("/", "layout");
}

/* -------------------------------------------------------------------------- */
/* Creating and deleting                                                       */
/*                                                                             */
/* Editing what already exists is not a content system. A blog you cannot add  */
/* a post to is a page with three posts on it.                                 */
/* -------------------------------------------------------------------------- */

/**
 * Turns a title into a URL segment.
 *
 * Deliberately conservative: lowercase, ASCII, hyphens. A slug is a permanent
 * public URL — it should never contain anything that needs escaping, and it
 * should stay readable in an address bar a year from now.
 */
// Not exported: a "use server" file may only export async functions, since
// everything it exports becomes a callable endpoint. Same rule that moved
// LEAD_STATUSES out of the leads actions.
function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Appends -2, -3 … until nothing is using it. */
async function uniqueSlug(
  supabase: NonNullable<Awaited<ReturnType<typeof requireAdmin>>>,
  table: "posts" | "case_studies" | "portfolio_items",
  base: string,
): Promise<string> {
  let slug = base;
  for (let n = 2; n < 50; n++) {
    const { data } = await supabase.from(table).select("id").eq("slug", slug).maybeSingle();
    if (!data) return slug;
    slug = `${base}-${n}`;
  }
  return `${base}-${Date.now()}`;
}

/* -------------------------------------------------------------------------- */
/* Portfolio                                                                    */
/* -------------------------------------------------------------------------- */

/** "GA4, Google Tag Manager" becomes ["GA4", "Google Tag Manager"]. */
function toSkills(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean)
    .slice(0, 12);
}

/** A YouTube id, or the id pulled out of a pasted YouTube link. */
function toVideoId(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const fromUrl = /(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/.exec(text)?.[1];
  const id = fromUrl ?? text;
  return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}


/* -------------------------------------------------------------------------- */
/* The list-and-edit screens                                                    */
/*                                                                             */
/* One set of actions for all five content screens: save from the editor       */
/* drawer, show or hide from the list, reorder, duplicate, delete. Called with  */
/* plain arguments from client code rather than through a <form>, and every    */
/* one checks the allowlist and writes through the admin's own session, the    */
/* same as the form actions above.                                             */
/* -------------------------------------------------------------------------- */

const TABLE = {
  "case-studies": "case_studies",
  portfolio: "portfolio_items",
  reviews: "reviews",
  posts: "posts",
  faqs: "faqs",
} as const;

const ADMIN_PATH: Record<ContentKind, string> = {
  "case-studies": "/admin/case-studies",
  portfolio: "/admin/portfolio",
  reviews: "/admin/reviews",
  posts: "/admin/posts",
  faqs: "/admin/faqs",
};

function isKind(kind: unknown): kind is ContentKind {
  return typeof kind === "string" && (CONTENT_KINDS as string[]).includes(kind);
}

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const bool = (value: unknown) => value === true;

async function afterWrite(kind: ContentKind) {
  await revalidateContent();
  revalidatePath(ADMIN_PATH[kind]);
}

/** The next sort_order at the end of a list. */
async function nextOrder(
  supabase: NonNullable<Awaited<ReturnType<typeof requireAdmin>>>,
  kind: ContentKind,
  reviewType?: "written" | "video",
): Promise<number> {
  // Typed loosely on purpose: the five tables share sort_order, and only
  // reviews has the type column the filter below needs.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase.from(TABLE[kind]).select("sort_order").order("sort_order", { ascending: false }).limit(1);
  if (kind === "portfolio") query = query.lt("sort_order", 9000);
  if (kind === "reviews" && reviewType) query = query.eq("type", reviewType);
  const { data } = await query.maybeSingle();
  const last = (data as { sort_order: number } | null)?.sort_order;
  return (last ?? (kind === "portfolio" ? 1000 : -1)) + 1;
}

/** Show or hide one item: `status` on case studies and posts, `published` elsewhere. */
export async function setVisibility(kind: ContentKind, id: string, visible: boolean): Promise<SaveResult> {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false, message: ACTION_ERRORS.notAllowed };
  if (!isKind(kind) || !id) return { ok: false, message: ACTION_ERRORS.noId };

  const now = new Date().toISOString();
  let error;
  if (kind === "case-studies") {
    ({ error } = await supabase
      .from("case_studies")
      .update({ status: visible ? "published" : "draft", updated_at: now })
      .eq("id", id));
  } else if (kind === "posts") {
    const { data: post } = await supabase.from("posts").select("is_draft").eq("id", id).maybeSingle();
    ({ error } = await supabase
      .from("posts")
      .update({
        status: visible ? "published" : "draft",
        published_at: visible && post && !post.is_draft ? now : null,
        updated_at: now,
      })
      .eq("id", id));
  } else {
    ({ error } = await supabase.from(TABLE[kind]).update({ published: visible, updated_at: now }).eq("id", id));
  }
  if (error) return { ok: false, message: error.message };

  await afterWrite(kind);
  return { ok: true, id, message: visible ? "Published" : "Moved to hidden" };
}

/** Writes sort_order from the order of `ids`: first id first. */
export async function reorderItems(kind: ContentKind, ids: string[]): Promise<SaveResult> {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false, message: ACTION_ERRORS.notAllowed };
  if (!isKind(kind) || !Array.isArray(ids) || ids.some((id) => typeof id !== "string")) {
    return { ok: false, message: ACTION_ERRORS.noId };
  }

  // Portfolio items live at 1000 and up; the featured split above 9000 is
  // left alone by starting where they already are.
  const base = kind === "portfolio" ? 1000 : 0;
  const results = await Promise.all(
    ids.map((id, i) => supabase.from(TABLE[kind]).update({ sort_order: base + i }).eq("id", id)),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return { ok: false, message: failed.error.message };

  await afterWrite(kind);
  return { ok: true, id: ids[0] ?? "", message: "Order saved" };
}

/** A copy of one item, hidden, at the end of the list. Returns the new id. */
export async function duplicateItem(kind: ContentKind, id: string): Promise<SaveResult> {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false, message: ACTION_ERRORS.notAllowed };
  if (!isKind(kind) || !id) return { ok: false, message: ACTION_ERRORS.noId };

  const { data: row, error: readError } = await supabase.from(TABLE[kind]).select("*").eq("id", id).maybeSingle();
  if (readError || !row) return { ok: false, message: readError?.message ?? "That item no longer exists." };

  const copy: Record<string, unknown> = { ...(row as Record<string, unknown>) };
  for (const key of ["id", "created_at", "updated_at"]) delete copy[key];

  if (kind === "case-studies" || kind === "posts" || kind === "portfolio") {
    copy.title = `${copy.title} (copy)`;
    copy.slug = await uniqueSlug(supabase, TABLE[kind] as "posts" | "case_studies" | "portfolio_items", `${copy.slug}-copy`.slice(0, 70));
  }
  if (kind === "case-studies" || kind === "posts") copy.status = "draft";
  if (kind === "posts") copy.published_at = null;
  if (kind === "portfolio" || kind === "reviews" || kind === "faqs") copy.published = false;
  if (kind === "portfolio") copy.upwork_id = null;
  if (kind === "reviews") copy.source_key = `${copy.type}:manual:${crypto.randomUUID()}`;
  if (kind === "faqs") {
    copy.question = `${copy.question} (copy)`;
    copy.source_key = null;
  }
  copy.sort_order = await nextOrder(supabase, kind, (copy.type as "written" | "video") ?? undefined);

  const { data: created, error } = await supabase.from(TABLE[kind]).insert(copy as never).select("id").single();
  if (error || !created) return { ok: false, message: error?.message ?? "Could not copy it." };

  await afterWrite(kind);
  return { ok: true, id: (created as { id: string }).id, message: "Duplicated, hidden" };
}

/** Deletes one item. The list asks first, in a dialog that names it. */
export async function deleteItem(kind: ContentKind, id: string): Promise<SaveResult> {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false, message: ACTION_ERRORS.notAllowed };
  if (!isKind(kind) || !id) return { ok: false, message: ACTION_ERRORS.noId };

  const { error } = await supabase.from(TABLE[kind]).delete().eq("id", id);
  if (error) return { ok: false, message: error.message };

  await afterWrite(kind);
  return { ok: true, id, message: "Deleted" };
}

/**
 * Saves the editor drawer: creates when `id` is null, updates otherwise.
 * Every field is checked here, whatever the editor already checked, and a
 * problem comes back against the field it belongs to.
 */
export async function saveItem(kind: ContentKind, id: string | null, draft: unknown): Promise<SaveResult> {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false, message: ACTION_ERRORS.notAllowed };
  if (!isKind(kind) || typeof draft !== "object" || draft === null) {
    return { ok: false, message: "Nothing to save." };
  }
  const d = draft as Record<string, unknown>;
  const fields: Record<string, string> = {};
  const required = (key: string, label: string) => {
    if (!text(d[key])) fields[key] = `${label} is required.`;
  };
  const now = new Date().toISOString();
  let row: Record<string, unknown> = {};

  if (kind === "case-studies") {
    required("title", "Title");
    required("intro", "Intro");
    required("body", "Summary");
    const pct = (key: string) => {
      const raw = text(d[key]);
      if (!raw) return null;
      const value = Number(raw);
      if (!Number.isFinite(value) || value < 0 || value > 100) fields[key] = "Use a number from 0 to 100.";
      return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : null;
    };
    const sections = Array.isArray(d.detail_sections) ? d.detail_sections : [];
    const detail = sections.map((s, i) => {
      const section = (s ?? {}) as { heading?: unknown; paras?: unknown };
      const heading = text(section.heading);
      const paras = (Array.isArray(section.paras) ? section.paras : []).map(text).filter(Boolean);
      if (!heading) fields[`detail_sections.${i}`] = "Give this section a heading.";
      return { heading, paras };
    });
    row = {
      title: text(d.title),
      code: text(d.code).toUpperCase() || "CASE",
      intro: text(d.intro),
      body: text(d.body),
      tags: (Array.isArray(d.tags) ? d.tags : []).map(text).filter(Boolean).slice(0, 12),
      status: d.status === "published" ? "published" : "draft",
      needs_confirmation: bool(d.needs_confirmation),
      metric_caption: text(d.metric_caption) || null,
      metric_before_label: text(d.metric_before_label) || null,
      metric_after_label: text(d.metric_after_label) || null,
      metric_before: text(d.metric_before) || null,
      metric_after: text(d.metric_after) || null,
      metric_before_pct: pct("metric_before_pct"),
      metric_after_pct: pct("metric_after_pct"),
      detail_sections: detail,
    };
  } else if (kind === "portfolio") {
    required("title", "Title");
    required("description", "Description");
    const url = text(d.url);
    if (!/^https:\/\//.test(url)) fields.url = "The link has to start with https://";
    const videoRaw = text(d.video_id);
    const videoId = toVideoId(videoRaw);
    if (videoRaw && !videoId) fields.video_id = "Paste the 11-character YouTube id or the video's link.";
    row = {
      title: text(d.title),
      description: text(d.description),
      url,
      client: text(d.client) || null,
      role: text(d.role) || null,
      video_id: videoId,
      skills: toSkills((Array.isArray(d.skills) ? d.skills : []).map(text).join(",")),
      featured: bool(d.featured),
      published: bool(d.published),
    };
  } else if (kind === "reviews") {
    const type = d.type === "video" ? "video" : "written";
    const published = bool(d.published);
    if (type === "written") {
      required("quote", "The quote");
      const quote = text(d.quote);
      const rating = text(d.rating);
      if (rating && !/^[1-5]$/.test(rating)) fields.rating = "Use a whole number from 1 to 5.";
      row = {
        type,
        quote: quote || null,
        attribution: text(d.attribution) || null,
        rating: rating ? Number(rating) : null,
        // Derived, never typed: see updateReview above.
        is_placeholder: quote.startsWith("Upwork review ") || quote === "",
        published,
      };
    } else {
      const youtubeId = toVideoId(text(d.youtube_id));
      if (!youtubeId) fields.youtube_id = "Paste the 11-character YouTube id or the video's link.";
      row = {
        type,
        youtube_id: youtubeId,
        youtube_url: youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : null,
        client_name: text(d.client_name) || null,
        company: text(d.company) || null,
        a11y_label: text(d.a11y_label) || null,
        aspect_ratio: d.aspect_ratio === "landscape" ? "landscape" : "portrait",
        is_placeholder: false,
        published,
      };
    }
  } else if (kind === "posts") {
    required("title", "Title");
    const paragraphs = toParagraphs(typeof d.body === "string" ? d.body : "");
    const isDraft = bool(d.is_draft);
    const blocked = finishBlockedReason(isDraft, paragraphs);
    if (blocked) fields.body = "Add the post body, or keep it marked unfinished.";
    const status = d.status === "published" ? "published" : "draft";
    row = {
      title: text(d.title),
      summary: text(d.summary) || text(d.title),
      topic: text(d.topic).toUpperCase() || "NOTES",
      reading_time: text(d.reading_time).toUpperCase() || "5 MIN",
      body: paragraphs,
      status,
      is_draft: isDraft,
      published_at: status === "published" && !isDraft ? now : null,
    };
  } else {
    required("question", "Question");
    required("answer", "Answer");
    row = { question: text(d.question), answer: text(d.answer), published: bool(d.published) };
  }

  if (Object.keys(fields).length) {
    return { ok: false, message: "Check the highlighted fields.", fields };
  }

  row.updated_at = now;

  if (id) {
    const { error } = await supabase.from(TABLE[kind]).update(row as never).eq("id", id);
    if (error) return { ok: false, message: error.message };
    await afterWrite(kind);
    return { ok: true, id, message: "Saved" };
  }

  // A new item.
  if (kind === "case-studies" || kind === "posts" || kind === "portfolio") {
    const base = slugify(String(row.title));
    row.slug = await uniqueSlug(
      supabase,
      TABLE[kind] as "posts" | "case_studies" | "portfolio_items",
      kind === "portfolio" ? base.slice(0, 60).replace(/-+$/, "") : base,
    );
  }
  if (kind === "portfolio") row.upwork_id = null;
  if (kind === "reviews") {
    row.source = "upwork";
    row.source_key = `${row.type}:manual:${crypto.randomUUID()}`;
  }
  row.sort_order = await nextOrder(supabase, kind, (row.type as "written" | "video") ?? undefined);

  const { data, error } = await supabase.from(TABLE[kind]).insert(row as never).select("id").single();
  if (error || !data) return { ok: false, message: error?.message ?? "Could not create it." };

  await afterWrite(kind);
  return { ok: true, id: (data as { id: string }).id, message: "Created" };
}
