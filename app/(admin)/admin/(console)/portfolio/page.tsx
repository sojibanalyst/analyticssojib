import type { Metadata } from "next";
import { ContentScreen } from "@/components/admin/content/ContentScreen";
import type { AnyRow } from "@/components/admin/content/kinds";
import { PageHeader } from "@/components/admin/ui/Basics";
import { AdminState } from "@/components/admin/Table";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Portfolio",
  robots: { index: false, follow: false },
};

export default async function PortfolioPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("portfolio_items")
    .select("id, slug, title, description, skills, client, role, url, video_id, featured, published, images, updated_at")
    .order("sort_order", { ascending: true });

  return (
    <>
      <PageHeader
        title="Portfolio"
        subtitle="Projects on /work and the homepage, in site order."
        help="Featured projects show on the homepage. A new project starts hidden."
      />
      {error ? (
        <AdminState tone="error" title="Could not read projects.">
          {error.message}
        </AdminState>
      ) : (
        <ContentScreen kind="portfolio" rows={(data ?? []) as unknown as AnyRow[]} />
      )}
    </>
  );
}
