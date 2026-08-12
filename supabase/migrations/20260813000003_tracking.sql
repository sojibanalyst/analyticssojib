-- Collector storage: sessions, events, and the fan-out ledger.
-- Written by service_role from server code only. Never readable by anon.

create type public.delivery_status as enum ('pending', 'sent', 'failed', 'skipped');
create type public.device_type     as enum ('desktop', 'mobile', 'tablet', 'bot', 'unknown');

-- ---------------------------------------------------------------------------
-- sessions
--
-- first_touch_* is written once and never overwritten; last_touch_* is
-- rewritten every visit. That split is the whole point of storing attribution
-- here rather than recomputing it — it is what lets a lead be credited to the
-- campaign that originally found them.
--
-- Click IDs are captured on first sight and persist for the session lifetime,
-- because a visitor who arrives on ?gclid=… and converts three pages later
-- still converted because of that click.
-- ---------------------------------------------------------------------------
create table public.sessions (
  session_id            uuid primary key,
  first_seen_at         timestamptz not null default now(),
  last_seen_at          timestamptz not null default now(),

  first_touch_source    text,
  first_touch_medium    text,
  first_touch_campaign  text,
  first_touch_term      text,
  first_touch_content   text,

  last_touch_source     text,
  last_touch_medium     text,
  last_touch_campaign   text,
  last_touch_term       text,
  last_touch_content    text,

  landing_page          text,
  referrer              text,

  gclid                 text,
  fbclid                text,
  ttclid                text,
  msclkid               text,

  user_agent            text,
  device_type           public.device_type not null default 'unknown',
  country               text,
  consent               jsonb not null default '{}'::jsonb,
  event_count           integer not null default 0
);

create index sessions_last_seen_idx    on public.sessions (last_seen_at desc);
create index sessions_first_source_idx on public.sessions (first_touch_source, first_touch_medium);
create index sessions_campaign_idx     on public.sessions (first_touch_campaign);
create index sessions_gclid_idx        on public.sessions (gclid) where gclid is not null;
create index sessions_fbclid_idx       on public.sessions (fbclid) where fbclid is not null;

-- ---------------------------------------------------------------------------
-- events
--
-- event_id is UNIQUE and is the deduplication key. The same id is generated
-- once in the browser and reused for the server call, so the browser pixel and
-- the server event resolve to one conversion at every destination. If this
-- constraint is ever dropped, deduplication is gone.
-- ---------------------------------------------------------------------------
create table public.events (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid references public.sessions (session_id) on delete set null,
  event_name  text not null,
  event_id    text not null unique,
  occurred_at timestamptz not null,
  page_path   text,
  params      jsonb not null default '{}'::jsonb,
  consent     jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now()
);

create index events_occurred_idx  on public.events (occurred_at desc);
create index events_name_idx      on public.events (event_name, occurred_at desc);
create index events_session_idx   on public.events (session_id, occurred_at desc);
create index events_page_path_idx on public.events (page_path);

-- ---------------------------------------------------------------------------
-- event_deliveries
--
-- One row per destination per event. A skipped delivery keeps its reason, so
-- the Destinations screen can explain silence instead of hiding it — nothing
-- is ever dropped without a record.
-- ---------------------------------------------------------------------------
create table public.event_deliveries (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references public.events (id) on delete cascade,
  destination    text not null,
  status         public.delivery_status not null default 'pending',
  attempt_count  smallint not null default 0,
  response_code  integer,
  response_body  text,
  skipped_reason text,
  sent_at        timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  unique (event_id, destination)
);

create index event_deliveries_status_idx  on public.event_deliveries (status, created_at);
create index event_deliveries_pending_idx on public.event_deliveries (created_at)
  where status = 'pending';
create index event_deliveries_dest_idx    on public.event_deliveries (destination, status);

create trigger event_deliveries_updated_at
  before update on public.event_deliveries
  for each row execute function public.set_updated_at();
