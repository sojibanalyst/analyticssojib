"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { isAllowedEmail } from "@/lib/auth";
import { CONTENT_TAG } from "@/lib/content/client";
import { createClient, getUser } from "@/lib/supabase/server";

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

  await supabase
    .from("case_studies")
    .update({
      title: String(formData.get("title") ?? "").trim() || undefined,
      body: String(formData.get("body") ?? "").trim() || undefined,
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
