-- Splits two things migration 2 wrongly merged into one column.
--
-- `posts.status` was doing two jobs: "is this page visible" and "is the
-- writing finished". They are not the same, and on this site they disagree.
-- All three posts are unfinished, but all three have live URLs today — each
-- renders its title and summary with a DRAFT badge, a "still being written"
-- notice and a noindex.
--
-- The bug this fixes was caught by the build, not by review: after the pages
-- started reading from Supabase, `generateStaticParams` returned nothing,
-- because the public RLS policy filters on `status = 'published'` and every
-- post was 'draft'. Three live URLs would have started 404ing. No public URL
-- may change.
--
-- After this:
--   status   — visible to the public at all. P6 uses it to take a page down.
--   is_draft — the writing is unfinished. Drives the badge and the noindex.

alter table public.posts add column is_draft boolean not null default false;

comment on column public.posts.is_draft is
  'Writing unfinished: renders the DRAFT badge and a noindex, but the URL still resolves. Visibility is `status`.';

-- Everything currently marked draft is unfinished but publicly reachable,
-- which is exactly what the site does today.
update public.posts
set is_draft = (status = 'draft'),
    status = 'published';
