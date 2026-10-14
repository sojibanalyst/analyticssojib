"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import sharp from "sharp";

import { isAllowedEmail } from "@/lib/auth";
import { CONTENT_TAG } from "@/lib/content/client";
import { MEDIA_BUCKET, mediaPathOf, type MediaItem, type MediaKind, type MediaResult } from "@/lib/media";
import { createClient, getUser } from "@/lib/supabase/server";

/**
 * Screenshots from the console's Media tab.
 *
 * Upload converts to WebP exactly as `npm run portfolio:images` does (at most
 * 1600px wide, quality 78), stores the file in the public `portfolio` bucket
 * through the admin's own session (the bucket's policy is is_admin(), never
 * the service role), and adds it to the item: a project's `images` list, or a
 * new row in case_study_shots for a case study.
 *
 * Every action checks the allowlist itself: a Server Action is a POST
 * endpoint anyone can call. Nothing here deletes a file unless it is asked to
 * by name and no item still uses it.
 */


const MAX_BYTES = 10 * 1024 * 1024;
const TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_WIDTH = 1600;
const QUALITY = 78;

async function requireAdmin() {
  const user = await getUser();
  if (!isAllowedEmail(user?.email)) return null;
  return createClient();
}

async function refreshSite(kind: MediaKind) {
  revalidateTag(CONTENT_TAG, { expire: 0 });
  revalidatePath("/", "layout");
  revalidatePath(kind === "portfolio" ? "/admin/portfolio" : "/admin/case-studies");
}

type StoredImage = { src: string; alt: string; width: number; height: number };

function imagesOf(value: unknown): StoredImage[] {
  return Array.isArray(value)
    ? value.filter((i): i is StoredImage => !!i && typeof i.src === "string" && typeof i.alt === "string")
    : [];
}

const isKind = (kind: unknown): kind is MediaKind => kind === "portfolio" || kind === "case-studies";
const cleanAlt = (alt: unknown) => (typeof alt === "string" ? alt.trim().slice(0, 300) : "");

/** One file in, one WebP stored and attached. */
export async function uploadMedia(kind: MediaKind, id: string, formData: FormData): Promise<MediaResult> {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false, message: "You are not signed in as an admin." };
  if (!isKind(kind) || !id) return { ok: false, message: "Save the item first, then add screenshots." };

  // The checkbox in the form, checked again here: a request that skipped the
  // form has not confirmed anything.
  if (formData.get("checked") !== "yes") {
    return { ok: false, message: "Tick the check for keys, emails and names first." };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, message: "No file arrived." };
  if (!TYPES.has(file.type)) return { ok: false, message: `${file.name}: use PNG, JPG or WebP.` };
  if (file.size > MAX_BYTES) return { ok: false, message: `${file.name} is over 10 MB.` };

  let output: Buffer;
  let width: number;
  let height: number;
  try {
    const { data, info } = await sharp(Buffer.from(await file.arrayBuffer()))
      .rotate()
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toBuffer({ resolveWithObject: true });
    output = data;
    width = info.width;
    height = info.height;
  } catch {
    return { ok: false, message: `${file.name} could not be read as an image.` };
  }

  const table = kind === "portfolio" ? "portfolio_items" : "case_studies";
  const { data: owner, error: ownerError } = await supabase.from(table).select("title").eq("id", id).maybeSingle();
  if (ownerError || !owner) return { ok: false, message: "That item no longer exists." };

  const path = `${kind}/${id}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.webp`;
  const { error: uploadError } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, output, { contentType: "image/webp", upsert: false });
  if (uploadError) return { ok: false, message: uploadError.message };

  const src = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
  const alt = `Screenshot from the project: ${owner.title}`;

  if (kind === "portfolio") {
    const { data: row } = await supabase.from("portfolio_items").select("images").eq("id", id).single();
    const images = [...imagesOf(row?.images), { src, alt, width, height }];
    const { error } = await supabase.from("portfolio_items").update({ images }).eq("id", id);
    if (error) return { ok: false, message: error.message };
  } else {
    const { count } = await supabase
      .from("case_study_shots")
      .select("id", { count: "exact", head: true })
      .eq("case_study_id", id);
    const { error } = await supabase.from("case_study_shots").insert({
      case_study_id: id,
      storage_path: src,
      alt_text: alt,
      caption: "",
      section: null,
      sort_order: count ?? 0,
    });
    if (error) return { ok: false, message: error.message };
  }

  await refreshSite(kind);
  return { ok: true, message: `Added ${file.name}`, item: { src, alt, caption: "", section: "", width, height } };
}

/**
 * Writes the gallery as shown: its order (the first is the cover), each alt
 * text and caption, and which images it still has. Only images the item
 * already holds are accepted, so this cannot point an item at a new address.
 * An image left out is removed from the item; its file stays.
 */
export async function saveGallery(kind: MediaKind, id: string, items: MediaItem[]): Promise<MediaResult> {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false, message: "You are not signed in as an admin." };
  if (!isKind(kind) || !id || !Array.isArray(items)) return { ok: false, message: "Nothing to save." };

  if (kind === "portfolio") {
    const { data: row, error: readError } = await supabase.from("portfolio_items").select("images").eq("id", id).single();
    if (readError || !row) return { ok: false, message: readError?.message ?? "That project no longer exists." };
    const current = new Map(imagesOf(row.images).map((image) => [image.src, image]));
    const images = items
      .filter((item) => current.has(item.src))
      .map((item) => ({ ...current.get(item.src)!, alt: cleanAlt(item.alt) || current.get(item.src)!.alt }));
    const { error } = await supabase.from("portfolio_items").update({ images }).eq("id", id);
    if (error) return { ok: false, message: error.message };
  } else {
    const { data: shots, error: readError } = await supabase
      .from("case_study_shots")
      .select("id, storage_path")
      .eq("case_study_id", id);
    if (readError) return { ok: false, message: readError.message };
    const bySrc = new Map((shots ?? []).map((s) => [s.storage_path, s.id]));
    const keep = items.filter((item) => bySrc.has(item.src));
    const keepIds = new Set(keep.map((item) => bySrc.get(item.src)));
    const updates = keep.map((item, i) =>
      supabase
        .from("case_study_shots")
        .update({
          sort_order: i,
          alt_text: cleanAlt(item.alt) || "Screenshot",
          caption: typeof item.caption === "string" ? item.caption.trim().slice(0, 300) : "",
          section: item.section?.trim() || null,
        })
        .eq("id", bySrc.get(item.src)!),
    );
    const removed = (shots ?? []).filter((s) => !keepIds.has(s.id)).map((s) => s.id);
    const results = await Promise.all([
      ...updates,
      ...(removed.length ? [supabase.from("case_study_shots").delete().in("id", removed)] : []),
    ]);
    const failed = results.find((r) => r.error);
    if (failed?.error) return { ok: false, message: failed.error.message };
  }

  await refreshSite(kind);
  return { ok: true, message: "Gallery saved" };
}

/**
 * Deletes an uploaded file from storage, when asked to and only if no project
 * or case study still shows it. Files under /portfolio on the site itself are
 * part of the repository and are not touched here.
 */
export async function deleteMediaFile(src: string): Promise<MediaResult> {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false, message: "You are not signed in as an admin." };

  const path = typeof src === "string" ? mediaPathOf(src) : null;
  if (!path) return { ok: false, message: "That file is part of the site's code, so it stays." };

  const [projects, shots] = await Promise.all([
    supabase.from("portfolio_items").select("id").contains("images", JSON.stringify([{ src }])),
    supabase.from("case_study_shots").select("id").eq("storage_path", src),
  ]);
  if ((projects.data?.length ?? 0) + (shots.data?.length ?? 0) > 0) {
    return { ok: false, message: "Another item still uses that file, so it was kept." };
  }

  const { error } = await supabase.storage.from(MEDIA_BUCKET).remove([path]);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "File deleted" };
}
