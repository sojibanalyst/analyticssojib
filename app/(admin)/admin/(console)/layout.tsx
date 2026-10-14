import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { isAllowedEmail } from "@/lib/auth";
import { createClient, getUser } from "@/lib/supabase/server";
import { signOut } from "../actions";
import type { BadgeCounts } from "../nav";

/**
 * Everything behind the door.
 *
 * The (console) route group exists so /admin/login can stay outside this
 * layout — inside it, the guard below would redirect the login page to itself.
 * Route groups do not appear in URLs, so /admin is still /admin.
 *
 * The guard duplicates the middleware on purpose. Middleware is a redirect,
 * not an authorisation boundary: it can be bypassed by a misconfigured
 * matcher. This check, the middleware, and the RLS policies are three
 * independent layers, and the database one is the layer that actually holds.
 */
export default async function ConsoleLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getUser();

  if (!isAllowedEmail(user?.email)) {
    redirect("/admin/login");
  }

  return (
    <AdminShell email={user!.email!} signOut={signOut} counts={await badgeCounts()}>
      {children}
    </AdminShell>
  );
}

/**
 * The numbers beside the sidebar links: new leads, drafts, hidden items.
 *
 * Count-only queries (head: true), in parallel, through the admin's own
 * session. A count that fails is left out rather than shown as zero: a badge
 * that says nothing is waiting when the query broke would be a lie.
 */
async function badgeCounts(): Promise<BadgeCounts> {
  const supabase = await createClient();
  const count = { count: "exact" as const, head: true };
  const [leads, posts, cases, portfolio, reviews] = await Promise.all([
    supabase.from("leads").select("id", count).eq("status", "new").is("archived_at", null),
    supabase.from("posts").select("id", count).or("status.eq.draft,is_draft.eq.true"),
    supabase.from("case_studies").select("id", count).eq("status", "draft"),
    supabase.from("portfolio_items").select("id", count).eq("published", false),
    supabase.from("reviews").select("id", count).eq("published", false),
  ]);
  const pick = (r: { count: number | null; error: unknown }) => (r.error ? undefined : (r.count ?? undefined));
  return {
    newLeads: pick(leads),
    postDrafts: pick(posts),
    caseDrafts: pick(cases),
    portfolioHidden: pick(portfolio),
    reviewsHidden: pick(reviews),
  };
}
