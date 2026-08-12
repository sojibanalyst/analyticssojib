-- A stable key for rows imported from content/*.ts.
--
-- posts and case_studies already have `slug`. reviews and faqs have no natural
-- key at all — a written review is just a quote and an attribution — so
-- re-running the importer would either duplicate every row or require deleting
-- the table first, and deleting would destroy anything edited in the console.
--
-- source_key is what makes the import idempotent: it identifies which row in
-- the source file a database row came from, and nothing else uses it.

alter table public.reviews add column source_key text unique;
alter table public.faqs    add column source_key text unique;

comment on column public.reviews.source_key is
  'Identifies the content/site.ts entry this row was imported from. Import key only.';
comment on column public.faqs.source_key is
  'Identifies the content/site.ts entry this row was imported from. Import key only.';
