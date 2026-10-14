import type { Metadata } from "next";
import { ContentScreen } from "@/components/admin/content/ContentScreen";
import type { AnyRow } from "@/components/admin/content/kinds";
import { PageHeader } from "@/components/admin/ui/Basics";
import { AdminState } from "@/components/admin/Table";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "FAQs",
  robots: { index: false, follow: false },
};

export default async function FaqsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("faqs")
    .select("id, question, answer, published, updated_at")
    .order("sort_order", { ascending: true });

  return (
    <>
      <PageHeader title="FAQs" subtitle="Questions on /services, in site order." />
      {error ? (
        <AdminState tone="error" title="Could not read questions.">
          {error.message}
        </AdminState>
      ) : (
        <ContentScreen kind="faqs" rows={(data ?? []) as unknown as AnyRow[]} />
      )}
    </>
  );
}
