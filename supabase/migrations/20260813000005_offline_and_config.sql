-- Offline conversion uploads, plus the admin's own configuration tables.

create type public.upload_status as enum ('draft', 'exported', 'uploaded', 'failed');
create type public.row_result    as enum ('eligible', 'ineligible', 'accepted', 'rejected');

-- ---------------------------------------------------------------------------
-- offline conversions
-- ---------------------------------------------------------------------------
create table public.offline_conversion_uploads (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  destination       text not null,
  conversion_action text,
  value_source      text,
  currency          char(3),
  time_source       text,
  status            public.upload_status not null default 'draft',
  dry_run           boolean not null default true,
  row_count         integer not null default 0,
  accepted_count    integer not null default 0,
  rejected_count    integer not null default 0,
  result_message    text
);

create index offline_uploads_created_idx on public.offline_conversion_uploads (created_at desc);
create index offline_uploads_dest_idx    on public.offline_conversion_uploads (destination, status);

-- reason is mandatory whenever a row is not eligible: the design's rule is
-- that every rejection states why, so no lead is ever silently excluded.
create table public.offline_conversion_rows (
  id           uuid primary key default gen_random_uuid(),
  upload_id    uuid not null references public.offline_conversion_uploads (id) on delete cascade,
  lead_id      uuid references public.leads (id) on delete set null,
  result       public.row_result not null,
  reason       text,
  click_id     text,
  click_id_kind text,
  value        numeric(12,2),
  currency     char(3),
  conversion_time timestamptz,
  payload      jsonb,
  created_at   timestamptz not null default now(),

  constraint offline_rows_reason_required
    check (result not in ('ineligible', 'rejected') or reason is not null)
);

create index offline_rows_upload_idx on public.offline_conversion_rows (upload_id, result);
create index offline_rows_lead_idx   on public.offline_conversion_rows (lead_id);

-- ---------------------------------------------------------------------------
-- destinations
--
-- config holds NON-SECRET settings only — measurement ids, pixel ids, dataset
-- ids. Access tokens and API secrets live in Vercel env vars or Supabase
-- Vault. A check constraint cannot enforce "no secrets in here", so this is a
-- review rule: if a value would be dangerous in a screenshot, it does not
-- belong in this column.
-- ---------------------------------------------------------------------------
create table public.destinations (
  id              uuid primary key default gen_random_uuid(),
  key             text not null unique,
  label           text not null,
  enabled         boolean not null default false,
  config          jsonb not null default '{}'::jsonb,
  test_event_code text,
  last_ok_at      timestamptz,
  last_error_at   timestamptz,
  last_error      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger destinations_updated_at
  before update on public.destinations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- event_map — the documented contract, mirroring the tracking plan
-- ---------------------------------------------------------------------------
create table public.event_map (
  id                  uuid primary key default gen_random_uuid(),
  event_name          text not null unique,
  trigger_description text,
  parameters          jsonb not null default '{}'::jsonb,
  destinations        text[] not null default '{}',
  dedup_key           text,
  status              text not null default 'planned',
  last_fired_at       timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index event_map_status_idx on public.event_map (status);

create trigger event_map_updated_at
  before update on public.event_map
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- settings — exactly one row, enforced rather than assumed
-- ---------------------------------------------------------------------------
create table public.settings (
  id                 boolean primary key default true,
  site_name          text,
  contact_email      citext,
  calendly_url       text,
  gtm_container_id   text,
  sgtm_endpoint      text,
  default_currency   char(3) default 'USD',
  retention_days     integer not null default 400,
  updated_at         timestamptz not null default now(),

  constraint settings_single_row check (id)
);

create trigger settings_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

insert into public.settings (id) values (true) on conflict (id) do nothing;
