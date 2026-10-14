"use server";

import { isAllowedEmail } from "@/lib/auth";
import { createClient, getUser } from "@/lib/supabase/server";

export type PaletteEntry = { kind: string; title: string; href: string };

/**
 * What Ctrl+K can search: case studies, projects, reviews and posts, by title.
 *
 * Read when the palette is first opened, not on every page load. Checked
 * against the allowlist like every other action (a Server Action is a POST
 * endpoint anyone can call), and read through the caller's own session, so
 * RLS decides what comes back. Titles and ids only.
 */
export async function paletteIndex(): Promise<PaletteEntry[]> {
  const user = await getUser();
  if (!isAllowedEmail(user?.email)) return [];
  const supabase = await createClient();

  const [cases, projects, reviews, posts] = await Promise.all([
    supabase.from("case_studies").select("id, title").order("sort_order"),
    supabase.from("portfolio_items").select("id, title").order("sort_order"),
    supabase.from("reviews").select("id, client_name, attribution, quote").order("sort_order"),
    supabase.from("posts").select("id, title").order("sort_order"),
  ]);

  const edit = (path: string, id: string) => `/admin/${path}?edit=${id}`;

  return [
    ...(cases.data ?? []).map((r) => ({ kind: "Case study", title: r.title, href: edit("case-studies", r.id) })),
    ...(projects.data ?? []).map((r) => ({ kind: "Project", title: r.title, href: edit("portfolio", r.id) })),
    ...(reviews.data ?? []).map((r) => ({
      kind: "Review",
      title: r.client_name ?? r.attribution ?? (r.quote ?? "Review").slice(0, 60),
      href: edit("reviews", r.id),
    })),
    ...(posts.data ?? []).map((r) => ({ kind: "Post", title: r.title, href: edit("posts", r.id) })),
  ];
}
