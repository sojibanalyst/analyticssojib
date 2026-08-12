-- Content that currently lives in content/*.ts.
-- Slugs must match the existing files exactly: /case-studies/meta-roas-dedup…
-- and every /blog/<slug> has to keep resolving after P2 migrates the reads.

create type public.content_status as enum ('draft', 'published');
create type public.review_type    as enum ('video', 'written');
create type public.aspect_ratio   as enum ('portrait', 'landscape');

-- ---------------------------------------------------------------------------
-- posts — mirrors the Post type in content/posts.ts
-- ---------------------------------------------------------------------------
create table public.posts (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  topic          text not null,
  reading_time   text not null,
  title          text not null,
  summary        text not null,
  -- Paragraph array, matching Post.body. Empty until the post is written.
  body           text[] not null default '{}',
  status         public.content_status not null default 'draft',
  published_at   timestamptz,
  og_image_path  text,
  canonical_url  text,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index posts_status_published_idx on public.posts (status, published_at desc);
create index posts_sort_idx             on public.posts (sort_order);

create trigger posts_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- case_studies and their children
-- ---------------------------------------------------------------------------
create table public.case_studies (
  id                  uuid primary key default gen_random_uuid(),
  slug                text not null unique,
  code                text not null,
  status_label        text not null default 'FIXED',
  title               text not null,
  body                text not null,
  tags                text[] not null default '{}',
  intro               text not null,
  -- metric block on the card
  metric_caption      text,
  metric_before_label text,
  metric_after_label  text,
  metric_before       text,
  metric_after        text,
  metric_before_pct   numeric(5,2),
  metric_after_pct    numeric(5,2),
  -- long-form sections: [{ heading, paras[] }]
  detail_sections     jsonb not null default '[]'::jsonb,
  needs_confirmation  boolean not null default false,
  status              public.content_status not null default 'published',
  sort_order          integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index case_studies_status_idx on public.case_studies (status, sort_order);

create trigger case_studies_updated_at
  before update on public.case_studies
  for each row execute function public.set_updated_at();

create table public.case_study_stats (
  id             uuid primary key default gen_random_uuid(),
  case_study_id  uuid not null references public.case_studies (id) on delete cascade,
  value          text not null,
  unit           text,
  label          text not null,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now()
);

create index case_study_stats_parent_idx on public.case_study_stats (case_study_id, sort_order);

-- alt_text is NOT NULL here specifically. These are content images — evidence
-- a reader is meant to understand — unlike the decorative alt="" on the hero's
-- theme-alternate photo and the video posters, where an empty alt is correct
-- and required. See DESIGN-NOTES.md.
create table public.case_study_shots (
  id             uuid primary key default gen_random_uuid(),
  case_study_id  uuid not null references public.case_studies (id) on delete cascade,
  storage_path   text not null,
  caption        text not null,
  alt_text       text not null check (length(btrim(alt_text)) > 0),
  section        text,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now()
);

create index case_study_shots_parent_idx on public.case_study_shots (case_study_id, sort_order);

-- ---------------------------------------------------------------------------
-- reviews
--
-- aspect_ratio carries what Testimonial.orientation already does in code, so
-- portrait Shorts keep their 9:16 frame instead of being letterboxed into a
-- landscape card.
--
-- pull_quote is required for video reviews only — enforced by a check rather
-- than left to the application.
-- ---------------------------------------------------------------------------
create table public.reviews (
  id            uuid primary key default gen_random_uuid(),
  type          public.review_type not null,
  youtube_url   text,
  youtube_id    text,
  thumbnail_url text,
  aspect_ratio  public.aspect_ratio,
  pull_quote    text,
  quote         text,
  client_name   text,
  company       text,
  rating        smallint check (rating between 1 and 5),
  source        text,
  sort_order    integer not null default 0,
  published     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint reviews_video_needs_id
    check (type <> 'video' or youtube_id is not null),
  constraint reviews_video_needs_ratio
    check (type <> 'video' or aspect_ratio is not null),
  constraint reviews_written_needs_quote
    check (type <> 'written' or quote is not null)
);

create index reviews_published_idx on public.reviews (published, type, sort_order);

create trigger reviews_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- faqs — drives both the FAQ section and the FAQPage JSON-LD
-- ---------------------------------------------------------------------------
create table public.faqs (
  id         uuid primary key default gen_random_uuid(),
  question   text not null,
  answer     text not null,
  sort_order integer not null default 0,
  published  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index faqs_published_idx on public.faqs (published, sort_order);

create trigger faqs_updated_at
  before update on public.faqs
  for each row execute function public.set_updated_at();
