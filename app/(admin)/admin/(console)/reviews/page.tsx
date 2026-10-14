import type { Metadata } from "next";
import { ContentScreen } from "@/components/admin/content/ContentScreen";
import type { AnyRow } from "@/components/admin/content/kinds";
import { PageHeader } from "@/components/admin/ui/Basics";
import { AdminState } from "@/components/admin/Table";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Reviews",
  robots: { index: false, follow: false },
};

export default async function ReviewsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select(
      "id, type, quote, attribution, rating, youtube_id, client_name, company, a11y_label, aspect_ratio, is_placeholder, published, updated_at",
    )
    .order("type", { ascending: false })
    .order("sort_order", { ascending: true });

  return (
    <>
      <PageHeader
        title="Reviews"
        subtitle="Video and written reviews, quoted as the client wrote them."
        help="A review marked Needs check still holds placeholder text and never shows as a real quote."
      />
      {error ? (
        <AdminState tone="error" title="Could not read reviews.">
          {error.message}
        </AdminState>
      ) : (
        <ContentScreen kind="reviews" rows={(data ?? []) as unknown as AnyRow[]} />
      )}
    </>
  );
}
