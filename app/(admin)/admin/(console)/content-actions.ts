"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { isAllowedEmail } from "@/lib/auth";
import { CONTENT_TAG } from "@/lib/content/client";
import { createClient, getUser } from "@/lib/supabase/server";
import { DELETE_ERRORS, type DeleteState } from "./delete-state";

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

/** Publish, unpublish, or mark writing finished. */
export async function updatePost(formData: FormData): Promise<void> {
  const supabase = await requireAdmin();
  if (!supabase) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const status = formData.get("status") === "published" ? "published" : "draft";
  const isDraft = formData.get("is_draft") === "on";
  const body = String(formData.get("body") ?? "");

  // One paragraph per blank-line-separated block, matching how the page
  // renders it. Splitting on single newlines would turn a wrapped sentence
  // into three paragraphs.
  const paragraphs = body
    .split(/\n\s*\n/)
    .map((para) => para.trim().replace(/\s*\n\s*/g, " "))
    .filter(Boolean);

  await supabase
    .from("posts")
    .update({
      title: String(formData.get("title") ?? "").trim() || undefined,
      summary: String(formData.get("summary") ?? "").trim() || undefined,
      status,
      is_draft: isDraft,
      body: paragraphs,
      // A post that is finished and visible has a publication date. Setting it
      // here rather than asking for it keeps the two from disagreeing.
      published_at:
        status === "published" && !isDraft ? new Date().toISOString() : null,
    })
    .eq("id", id);

  await revalidateContent();
  revalidatePath("/admin/posts");
}

/** Replace a placeholder review with the client's actual words. */
export async function updateReview(formData: FormData): Promise<void> {
  const supabase = await requireAdmin();
  if (!supabase) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const quote = String(formData.get("quote") ?? "").trim();
  const attribution = String(formData.get("attribution") ?? "").trim();

  // is_placeholder is derived, never typed in. A slot stops being a
  // placeholder exactly when it stops containing the placeholder text — which
  // is the only definition that cannot drift from reality.
  const stillPlaceholder = quote.startsWith("Upwork review ") || quote === "";

  await supabase
    .from("reviews")
    .update({
      quote: quote || null,
      attribution: attribution || null,
      is_placeholder: stillPlaceholder,
      published: formData.get("published") === "on",
    })
    .eq("id", id);

  await revalidateContent();
  revalidatePath("/admin/reviews");
}

export async function updateFaq(formData: FormData): Promise<void> {
  const supabase = await requireAdmin();
  if (!supabase) return;

  const id = String(formData.get("id") ?? "");
  const question = String(formData.get("question") ?? "").trim();
  const answer = String(formData.get("answer") ?? "").trim();
  if (!id || !question || !answer) return;

  await supabase
    .from("faqs")
    .update({ question, answer, published: formData.get("published") === "on" })
    .eq("id", id);

  await revalidateContent();
  revalidatePath("/admin/faqs");
}

export async function updateCaseStudy(formData: FormData): Promise<void> {
  const supabase = await requireAdmin();
  if (!supabase) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const num = (key: string): number | null => {
    const raw = String(formData.get(key) ?? "").trim();
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : null;
  };

  await supabase
    .from("case_studies")
    .update({
      title: String(formData.get("title") ?? "").trim() || undefined,
      body: String(formData.get("body") ?? "").trim() || undefined,
      intro: String(formData.get("intro") ?? "").trim() || undefined,
      // The figures are yours to change. I locked these at first on the
      // reasoning that a published number should only move in a migration —
      // but they are your numbers, and a console that will not let you correct
      // your own case study is not much of a console.
      metric_caption: String(formData.get("metric_caption") ?? "").trim() || null,
      metric_before_label: String(formData.get("metric_before_label") ?? "").trim() || null,
      metric_after_label: String(formData.get("metric_after_label") ?? "").trim() || null,
      metric_before: String(formData.get("metric_before") ?? "").trim() || null,
      metric_after: String(formData.get("metric_after") ?? "").trim() || null,
      // The bar fill percentages, 0–100. Clamped rather than trusted.
      metric_before_pct: num("metric_before_pct"),
      metric_after_pct: num("metric_after_pct"),
      status: formData.get("status") === "published" ? "published" : "draft",
      // Ticking this off is the point of the flag: it marks a figure Sojib has
      // confirmed, so the console stops asking.
      needs_confirmation: formData.get("needs_confirmation") === "on",
    })
    .eq("id", id);

  await revalidateContent();
  revalidatePath("/admin/case-studies");
}

export async function updateSettings(formData: FormData): Promise<void> {
  const supabase = await requireAdmin();
  if (!supabase) return;

  await supabase
    .from("settings")
    .update({
      site_name: String(formData.get("site_name") ?? "").trim() || null,
      contact_email: String(formData.get("contact_email") ?? "").trim() || null,
      calendly_url: String(formData.get("calendly_url") ?? "").trim() || null,
      sgtm_endpoint: String(formData.get("sgtm_endpoint") ?? "").trim() || null,
      default_currency:
        String(formData.get("default_currency") ?? "").trim().toUpperCase().slice(0, 3) ||
        null,
    })
    .eq("id", true);

  revalidatePath("/admin/settings");
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
  table: "posts" | "case_studies",
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

export async function createPost(formData: FormData): Promise<void> {
  const supabase = await requireAdmin();
  if (!supabase) return;

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const slug = await uniqueSlug(supabase, "posts", slugify(title));

  const { data: last } = await supabase
    .from("posts")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase.from("posts").insert({
    slug,
    title,
    topic: String(formData.get("topic") ?? "").trim().toUpperCase() || "NOTES",
    reading_time: String(formData.get("reading_time") ?? "").trim().toUpperCase() || "5 MIN",
    summary: String(formData.get("summary") ?? "").trim() || title,
    body: [],
    // Born visible but unfinished: the URL works immediately and carries a
    // noindex until the writing is done. Nothing half-written reaches Google.
    status: "published",
    is_draft: true,
    sort_order: (last?.sort_order ?? -1) + 1,
  });

  await revalidateContent();
  revalidatePath("/admin/posts");
}

export async function deletePost(
  _prev: DeleteState,
  formData: FormData,
): Promise<DeleteState> {
  const supabase = await requireAdmin();
  if (!supabase) return { status: "error", message: DELETE_ERRORS.notAllowed };

  // The tick is the safety mechanism. The checkbox is marked required, so
  // the browser refuses to submit without it; this catches a request that
  // never went through the form. Returning a reason rather than returning
  // silently is the difference between a refusal and a broken button.
  if (formData.get("confirm") !== "on") {
    return { status: "error", message: DELETE_ERRORS.notConfirmed };
  }

  const id = String(formData.get("id") ?? "");
  if (!id) return { status: "error", message: DELETE_ERRORS.noId };

  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) return { status: "error", message: error.message };

  await revalidateContent();
  revalidatePath("/admin/posts");
  return { status: "deleted", message: "Post deleted." };
}

export async function createReview(formData: FormData): Promise<void> {
  const supabase = await requireAdmin();
  if (!supabase) return;

  const quote = String(formData.get("quote") ?? "").trim();
  if (!quote) return;

  const { data: last } = await supabase
    .from("reviews")
    .select("sort_order")
    .eq("type", "written")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase.from("reviews").insert({
    type: "written",
    quote,
    attribution: String(formData.get("attribution") ?? "").trim() || null,
    // Typed in by hand, so it is a real review by definition.
    is_placeholder: false,
    published: true,
    source: "upwork",
    source_key: `written:manual:${crypto.randomUUID()}`,
    sort_order: (last?.sort_order ?? -1) + 1,
  });

  await revalidateContent();
  revalidatePath("/admin/reviews");
}

export async function deleteReview(
  _prev: DeleteState,
  formData: FormData,
): Promise<DeleteState> {
  const supabase = await requireAdmin();
  if (!supabase) return { status: "error", message: DELETE_ERRORS.notAllowed };

  // The tick is the safety mechanism. The checkbox is marked required, so
  // the browser refuses to submit without it; this catches a request that
  // never went through the form. Returning a reason rather than returning
  // silently is the difference between a refusal and a broken button.
  if (formData.get("confirm") !== "on") {
    return { status: "error", message: DELETE_ERRORS.notConfirmed };
  }

  const id = String(formData.get("id") ?? "");
  if (!id) return { status: "error", message: DELETE_ERRORS.noId };

  const { error } = await supabase.from("reviews").delete().eq("id", id);
  if (error) return { status: "error", message: error.message };

  await revalidateContent();
  revalidatePath("/admin/reviews");
  return { status: "deleted", message: "Review deleted." };
}

export async function createFaq(formData: FormData): Promise<void> {
  const supabase = await requireAdmin();
  if (!supabase) return;

  const question = String(formData.get("question") ?? "").trim();
  const answer = String(formData.get("answer") ?? "").trim();
  if (!question || !answer) return;

  const { data: last } = await supabase
    .from("faqs")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase.from("faqs").insert({
    question,
    answer,
    published: true,
    source_key: `faq:manual:${crypto.randomUUID()}`,
    sort_order: (last?.sort_order ?? -1) + 1,
  });

  await revalidateContent();
  revalidatePath("/admin/faqs");
}

export async function deleteFaq(
  _prev: DeleteState,
  formData: FormData,
): Promise<DeleteState> {
  const supabase = await requireAdmin();
  if (!supabase) return { status: "error", message: DELETE_ERRORS.notAllowed };

  // The tick is the safety mechanism. The checkbox is marked required, so
  // the browser refuses to submit without it; this catches a request that
  // never went through the form. Returning a reason rather than returning
  // silently is the difference between a refusal and a broken button.
  if (formData.get("confirm") !== "on") {
    return { status: "error", message: DELETE_ERRORS.notConfirmed };
  }

  const id = String(formData.get("id") ?? "");
  if (!id) return { status: "error", message: DELETE_ERRORS.noId };

  const { error } = await supabase.from("faqs").delete().eq("id", id);
  if (error) return { status: "error", message: error.message };

  await revalidateContent();
  revalidatePath("/admin/faqs");
  return { status: "deleted", message: "Question deleted." };
}

export async function createCaseStudy(formData: FormData): Promise<void> {
  const supabase = await requireAdmin();
  if (!supabase) return;

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const slug = await uniqueSlug(supabase, "case_studies", slugify(title));

  const { data: last } = await supabase
    .from("case_studies")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase.from("case_studies").insert({
    slug,
    title,
    code: String(formData.get("code") ?? "").trim().toUpperCase() || "CASE",
    body: String(formData.get("body") ?? "").trim() || title,
    intro: String(formData.get("intro") ?? "").trim() || title,
    tags: String(formData.get("tags") ?? "")
      .split(",")
      .map((tag) => tag.trim().toUpperCase())
      .filter(Boolean),
    detail_sections: [],
    // Starts hidden. A case study with no figures and no write-up should not
    // appear on the site the instant it is created.
    status: "draft",
    needs_confirmation: false,
    sort_order: (last?.sort_order ?? -1) + 1,
  });

  await revalidateContent();
  revalidatePath("/admin/case-studies");
}

export async function deleteCaseStudy(
  _prev: DeleteState,
  formData: FormData,
): Promise<DeleteState> {
  const supabase = await requireAdmin();
  if (!supabase) return { status: "error", message: DELETE_ERRORS.notAllowed };

  // The tick is the safety mechanism. The checkbox is marked required, so
  // the browser refuses to submit without it; this catches a request that
  // never went through the form. Returning a reason rather than returning
  // silently is the difference between a refusal and a broken button.
  if (formData.get("confirm") !== "on") {
    return { status: "error", message: DELETE_ERRORS.notConfirmed };
  }

  const id = String(formData.get("id") ?? "");
  if (!id) return { status: "error", message: DELETE_ERRORS.noId };

  // Stats and screenshots go with it — the foreign keys cascade.
  const { error } = await supabase.from("case_studies").delete().eq("id", id);
  if (error) return { status: "error", message: error.message };

  await revalidateContent();
  revalidatePath("/admin/case-studies");
  return { status: "deleted", message: "Case study deleted." };
}
