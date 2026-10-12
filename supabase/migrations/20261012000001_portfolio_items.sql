-- "More work": small cards under the case files, each linking out to an
-- Upwork portfolio item.
--
-- A table of its own rather than rows in case_studies. A case study has a
-- slug, a body, an intro and a detail page at /case-studies/<slug>; these have
-- a title and a link and nothing else. Putting them in case_studies would
-- publish nine empty case pages and nine empty cards on the homepage.

create table public.portfolio_items (
  id         uuid primary key default gen_random_uuid(),
  title      text not null check (length(btrim(title)) > 0),
  url        text not null check (url ~ '^https://'),
  sort_order integer not null default 0,
  published  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index portfolio_items_published_idx on public.portfolio_items (published, sort_order);

create trigger portfolio_items_updated_at
  before update on public.portfolio_items
  for each row execute function public.set_updated_at();

alter table public.portfolio_items enable row level security;

-- Same model as every other content table: anon reads what is published, an
-- allowlisted admin does anything.
create policy portfolio_items_public_read on public.portfolio_items
  for select to anon, authenticated
  using (published);

create policy portfolio_items_admin_all on public.portfolio_items
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Titles as supplied by Sojib. Every link is the Upwork profile for now; each
-- row gets its own portfolio URL once those are to hand.
insert into public.portfolio_items (title, url, sort_order) values
  ('Shopify Jewelry Store: GTM, Meta CAPI & GA4, Offline & Online Tracking', 'https://www.upwork.com/freelancers/conversiontrackinggtmga4looker', 0),
  ('Lead Attribution & CRM Automation: GCLID, FBCLID & UTM Tracking', 'https://www.upwork.com/freelancers/conversiontrackinggtmga4looker', 1),
  ('Multi-Platform (GA4, Google Ads, Meta, TikTok, Snapchat) Tracking Setup', 'https://www.upwork.com/freelancers/conversiontrackinggtmga4looker', 2),
  ('Google Ads & GA4 Purchase Value Tracking', 'https://www.upwork.com/freelancers/conversiontrackinggtmga4looker', 3),
  ('Fixing Data Visualization Errors in Looker Studio', 'https://www.upwork.com/freelancers/conversiontrackinggtmga4looker', 4),
  ('GCLID Capture & Tracking Integration for Google Ads', 'https://www.upwork.com/freelancers/conversiontrackinggtmga4looker', 5),
  ('Custom JavaScript Tracking for Funnelish Pricing Tables (GA4 + GTM)', 'https://www.upwork.com/freelancers/conversiontrackinggtmga4looker', 6),
  ('Dynamic Price Scraping with JavaScript for Accurate Revenue Tracking', 'https://www.upwork.com/freelancers/conversiontrackinggtmga4looker', 7),
  ('Facebook Pixel and Server-Side Tracking, and GA4 Tracking', 'https://www.upwork.com/freelancers/conversiontrackinggtmga4looker', 8);
