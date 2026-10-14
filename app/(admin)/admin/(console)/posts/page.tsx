import type { Metadata } from "next";
import { ContentScreen } from "@/components/admin/content/ContentScreen";
import type { AnyRow } from "@/components/admin/content/kinds";
import { PageHeader } from "@/components/admin/ui/Basics";
import { AdminState } from "@/components/admin/Table";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Posts",
  robots: { index: false, follow: false },
};

export default async function PostsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select("id, slug, title, summary, body, topic, reading_time, status, is_draft, updated_at")
    .order("sort_order", { ascending: true });

  return (
    <>
      <PageHeader
        title="Posts"
        subtitle="Writing on /blog."
        help="Live decides whether the URL works at all. Unfinished keeps the URL but marks it draft and not indexed."
      />
      {error ? (
        <AdminState tone="error" title="Could not read posts.">
          {error.message}
        </AdminState>
      ) : (
        <ContentScreen kind="posts" rows={(data ?? []) as unknown as AnyRow[]} />
      )}
    </>
  );
}
