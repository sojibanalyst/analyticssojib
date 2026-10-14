import "server-only";

import { createClient } from "@supabase/supabase-js";
import { parseGtmSnippet, type HeadScript } from "@/lib/gtm-snippet";
import type { Database } from "@/lib/supabase/types";

/**
 * Site settings, read at REQUEST time and cached under a tag.
 *
 * This exists because of a specific trap: NEXT_PUBLIC_* is inlined into the
 * bundle when the site is built. Adding a settings field that writes
 * gtm_container_id to the database changes nothing on its own — the snippet
 * keeps rendering the constant that was baked in at build time, and the only
 * way to change it stays a redeploy. The read has to move too, which is what
 * this file is.
 *
 * Static rendering survives because the read is a cached, tagged GET — the
 * same mechanism lib/content uses. Saving on /admin/settings invalidates the
 * tag, so the next request re-reads and every later one is served from cache.
 * No page becomes dynamic and no page waits a full revalidate window.
 */
export const SETTINGS_TAG = "settings";

/**
 * An hour is the backstop only. Every path that changes a setting calls
 * revalidateTag(SETTINGS_TAG), so in practice the new value is live on the
 * next request.
 */
const SETTINGS_REVALIDATE = 3600;

export type SiteSettings = {
  gtmContainerId: string | null;
  /** The GTM <head> snippet pasted in the console, as stored. */
  gtmHeadCode: string | null;
  /** The tracking lab's own container (/lab only), id or pasted snippet. */
  labGtmContainerId: string | null;
  labGtmHeadCode: string | null;
  siteName: string | null;
  contactEmail: string | null;
  calendlyUrl: string | null;
  sgtmEndpoint: string | null;
  defaultCurrency: string;
};

const FALLBACK: SiteSettings = {
  gtmContainerId: null,
  gtmHeadCode: null,
  labGtmContainerId: null,
  labGtmHeadCode: null,
  siteName: null,
  contactEmail: null,
  calendlyUrl: null,
  sgtmEndpoint: null,
  defaultCurrency: "USD",
};

/** GTM container ids look like GTM-XXXXXXX. Anything else must not be rendered. */
export const GTM_ID_PATTERN = /^GTM-[A-Z0-9]{4,10}$/;

const cachedFetch: typeof fetch = (input, init) =>
  fetch(input, {
    ...init,
    next: { revalidate: SETTINGS_REVALIDATE, tags: [SETTINGS_TAG] },
  });

function settingsClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: cachedFetch },
    },
  );
}

/**
 * Never throws.
 *
 * Unlike the content reads, which fail the build loudly rather than publish a
 * page with its case studies missing, this one degrades: a settings row that
 * cannot be read should not take the whole site down. Every caller has a
 * defined behaviour for a missing value — and for GTM specifically, missing
 * means "render no snippet", which is the safe outcome.
 */
export async function getSettings(): Promise<SiteSettings> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return FALLBACK;

  try {
    // public_site_settings, not settings. The table is admin-only by RLS and
    // holds a contact email, an sGTM endpoint and a retention setting; the
    // view exposes exactly the one column a public page may render. Reading
    // the table here returned nothing and silently produced no GTM snippet —
    // see migration 20260815020001.
    const { data, error } = await settingsClient()
      .from("public_site_settings")
      .select("gtm_container_id, gtm_head_code, lab_gtm_container_id, lab_gtm_head_code")
      .maybeSingle();

    if (error || !data) return FALLBACK;

    return {
      ...FALLBACK,
      gtmContainerId: data.gtm_container_id,
      gtmHeadCode: data.gtm_head_code,
      labGtmContainerId: data.lab_gtm_container_id,
      labGtmHeadCode: data.lab_gtm_head_code,
    };
  } catch {
    return FALLBACK;
  }
}

/**
 * The container id to render, or null for "render nothing".
 *
 * Database first so it can be changed from the console, then the environment
 * so an existing deployment keeps working, then nothing.
 *
 * The shape is checked at the point of use, not only on save. A malformed id
 * reaching the snippet produces a container that silently never loads — worse
 * than no container, because the page looks instrumented and is not. Anything
 * that fails the pattern is treated as absent.
 */
export async function getGtmContainerId(): Promise<string | null> {
  const { gtmContainerId } = await getSettings();

  const candidate = (gtmContainerId ?? process.env.NEXT_PUBLIC_GTM_ID ?? "").trim().toUpperCase();
  return GTM_ID_PATTERN.test(candidate) ? candidate : null;
}

/**
 * The pasted GTM <head> snippet, split into scripts, or null when there is
 * none or it does not parse. Checked again here at the point of use, whatever
 * the console accepted: an invalid snippet renders nothing rather than half.
 * When this returns scripts they replace the id-built snippet.
 */
export async function getGtmHeadScripts(): Promise<{ scripts: HeadScript[]; containerId: string | null } | null> {
  const { gtmHeadCode } = await getSettings();
  if (!gtmHeadCode?.trim()) return null;
  const parsed = parseGtmSnippet(gtmHeadCode);
  return parsed.ok ? { scripts: parsed.scripts, containerId: parsed.containerId } : null;
}

/**
 * The tracking lab's container, from the console and nowhere else: the pasted
 * snippet when it parses, otherwise Google's standard snippet for the id, or
 * null for no container. Only the lab layout renders this.
 */
export async function getLabGtm(): Promise<{ scripts: HeadScript[]; containerId: string | null } | null> {
  const { labGtmContainerId, labGtmHeadCode } = await getSettings();
  if (labGtmHeadCode?.trim()) {
    const parsed = parseGtmSnippet(labGtmHeadCode);
    if (parsed.ok) return { scripts: parsed.scripts, containerId: parsed.containerId };
  }
  const id = (labGtmContainerId ?? "").trim().toUpperCase();
  if (!GTM_ID_PATTERN.test(id)) return null;
  return {
    containerId: id,
    scripts: [
      {
        inline: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${id}');`,
      },
    ],
  };
}
