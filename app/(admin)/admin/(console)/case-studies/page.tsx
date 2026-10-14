import type { Metadata } from "next";
import { ContentScreen } from "@/components/admin/content/ContentScreen";
import type { AnyRow } from "@/components/admin/content/kinds";
import { PageHeader } from "@/components/admin/ui/Basics";
import { AdminState } from "@/components/admin/Table";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Case studies",
  robots: { index: false, follow: false },
};

export default async function CaseStudiesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("case_studies")
    .select(
      `id, slug, code, title, intro, body, tags, status, needs_confirmation,
       metric_caption, metric_before, metric_after, metric_before_label, metric_after_label,
       metric_before_pct, metric_after_pct, detail_sections, updated_at,
       case_study_shots (storage_path, alt_text, caption, section, sort_order)`,
    )
    .order("sort_order", { ascending: true });

  // Published with figures nobody has confirmed: allowed, but never unnoticed.
  const liveUnconfirmed = (data ?? []).filter((row) => row.status === "published" && row.needs_confirmation).length;

  return (
    <>
      <PageHeader
        title="Case studies"
        subtitle="The full write-ups on /case-studies, in site order."
        help="The stats row is not editable here yet. Screenshots are added in the Media tab."
      />
      {liveUnconfirmed ? (
        <p className="ax-warn" role="note">
          {liveUnconfirmed === 1 ? "One case study is" : `${liveUnconfirmed} case studies are`} live with unconfirmed
          figures.
        </p>
      ) : null}
      {error ? (
        <AdminState tone="error" title="Could not read case studies.">
          {error.message}
        </AdminState>
      ) : (
        <ContentScreen kind="case-studies" rows={(data ?? []) as unknown as AnyRow[]} />
      )}
    </>
  );
}
