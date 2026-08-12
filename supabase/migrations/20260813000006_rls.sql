-- Row Level Security. Default deny everywhere, then the narrowest grants.
--
-- The model in one line: anon may read published content and nothing else;
-- an allowlisted admin may do anything; the collector writes as service_role,
-- which bypasses RLS by design and is never exposed to a browser.
--
-- Enabling RLS without adding a policy already denies everyone except
-- service_role, so the tracking and lead tables are locked by omission — but
-- each one is still enabled explicitly below rather than left to chance.

-- ---------------------------------------------------------------------------
-- Enable on every table
-- ---------------------------------------------------------------------------
alter table public.posts                      enable row level security;
alter table public.case_studies               enable row level security;
alter table public.case_study_stats           enable row level security;
alter table public.case_study_shots           enable row level security;
alter table public.reviews                    enable row level security;
alter table public.faqs                       enable row level security;
alter table public.sessions                   enable row level security;
alter table public.events                     enable row level security;
alter table public.event_deliveries           enable row level security;
alter table public.leads                      enable row level security;
alter table public.offline_conversion_uploads enable row level security;
alter table public.offline_conversion_rows    enable row level security;
alter table public.destinations               enable row level security;
alter table public.event_map                  enable row level security;
alter table public.settings                   enable row level security;

-- ---------------------------------------------------------------------------
-- Public read: published content only.
--
-- Note these are `to anon, authenticated`. A signed-in non-admin — which is
-- possible, since anyone can request a magic link — gets exactly what a
-- stranger gets, no more.
-- ---------------------------------------------------------------------------
create policy posts_public_read on public.posts
  for select to anon, authenticated
  using (status = 'published');

create policy case_studies_public_read on public.case_studies
  for select to anon, authenticated
  using (status = 'published');

-- Children are visible only through a visible parent.
create policy case_study_stats_public_read on public.case_study_stats
  for select to anon, authenticated
  using (exists (
    select 1 from public.case_studies c
    where c.id = case_study_id and c.status = 'published'
  ));

create policy case_study_shots_public_read on public.case_study_shots
  for select to anon, authenticated
  using (exists (
    select 1 from public.case_studies c
    where c.id = case_study_id and c.status = 'published'
  ));

create policy reviews_public_read on public.reviews
  for select to anon, authenticated
  using (published);

create policy faqs_public_read on public.faqs
  for select to anon, authenticated
  using (published);

-- ---------------------------------------------------------------------------
-- Admin: full access to everything, gated on the allowlist.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'posts', 'case_studies', 'case_study_stats', 'case_study_shots',
    'reviews', 'faqs', 'sessions', 'events', 'event_deliveries', 'leads',
    'offline_conversion_uploads', 'offline_conversion_rows',
    'destinations', 'event_map', 'settings'
  ]
  loop
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      t || '_admin_all', t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Deliberately absent, and this is the security model working as intended:
--
--   sessions, events, event_deliveries, leads, offline_*, destinations,
--   event_map, settings
--
-- have NO anon policy. anon cannot read a single row of any of them. The
-- collector reaches them as service_role from server code, never from a
-- browser.
-- ---------------------------------------------------------------------------
