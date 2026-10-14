import { FilterList } from "@/components/FilterList";
import { CaseFile, DefectTable, MetricNote } from "@/components/sections/CaseFiles";
import { CtaBand } from "@/components/sections/CtaBand";
import { PageHead } from "@/components/ui/PageHead";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { pages, work } from "@/content/site";
import { getCaseStudies } from "@/lib/content";
import { CASE_FILTERS, groupsOf } from "@/lib/filters";
import { pageMetadata } from "@/lib/page-metadata";

/** Static, like every other public page: built once, refreshed hourly. */
export const revalidate = 3600;

const copy = pages.caseStudies;

export const metadata = pageMetadata("/case-studies", copy.title, copy.description);

/**
 * Every case study at full size, filterable by platform and setup, then the
 * defects that come up again and again. Each case still has its own page at /case-studies/<slug>.
 */
export default async function CaseStudiesPage() {
  const cases = await getCaseStudies();
  return (
    <main id="main">
      <PageHead eyebrow={copy.eyebrow} title={copy.title} lead={copy.lead} titleId="cases-page-title" />

      <section className="section section--major section--ink" aria-labelledby="cases-title">
        <SectionHeading title={work.title} titleId="cases-title" />
        <FilterList
          entries={cases.map((item) => ({
            key: item.slug,
            groups: groupsOf([item.code, item.title, ...item.tags].join(" "), CASE_FILTERS),
            node: <CaseFile item={item} />,
          }))}
          order={CASE_FILTERS.map((rule) => rule.label)}
          label={copy.filterLabel}
          allLabel={copy.filterAll}
          showingLabel={copy.filterShowing}
          listClassName="case-list"
        />
        <MetricNote cases={cases} />
        <DefectTable />
      </section>

      <CtaBand />
    </main>
  );
}
