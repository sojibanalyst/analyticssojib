/**
 * Where uploaded screenshots live, and which image addresses the site accepts.
 *
 * Screenshots added from the console are stored in the public Supabase
 * Storage bucket `portfolio` (migration 20261014000001). Their URLs look like
 *   https://<project>.supabase.co/storage/v1/object/public/portfolio/<path>
 * Files saved by `npm run portfolio:images` stay under /portfolio/ on this
 * site. Anything else is refused, so a row cannot point an <img> anywhere.
 */
export const MEDIA_BUCKET = "portfolio";

export function mediaPublicPrefix(): string {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
  return base ? `${base}/storage/v1/object/public/${MEDIA_BUCKET}/` : "";
}

/** A site-relative path, or a file in the media bucket. */
export function isAllowedImageSrc(src: string): boolean {
  if (src.startsWith("/") && !src.startsWith("//")) return true;
  const prefix = mediaPublicPrefix();
  return !!prefix && src.startsWith(prefix);
}

/** The bucket path of an uploaded file, or null for a file under /public. */
export function mediaPathOf(src: string): string | null {
  const prefix = mediaPublicPrefix();
  return prefix && src.startsWith(prefix) ? src.slice(prefix.length) : null;
}

/** A screenshot as the console's gallery handles it. */
export type MediaKind = "portfolio" | "case-studies";
export type MediaItem = { src: string; alt: string; caption?: string; section?: string; width?: number; height?: number };
export type MediaResult = { ok: true; message: string; item?: MediaItem } | { ok: false; message: string };
