-- Leads from the public form.
--
-- Attribution is DENORMALISED at submission time rather than joined from
-- sessions. Two reasons: a session row can be deleted under retention rules
-- and the lead must survive it, and a lead's credited source must not silently
-- change if the session is later updated by a return visit.

create type public.lead_status as enum (
  'new', 'contacted', 'qualified', 'booked', 'won', 'lost'
);

create table public.leads (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  name         text not null,
  email        citext not null,
  company      text,
  platform     text,
  answers      jsonb not null default '{}'::jsonb,

  -- Nulled rather than cascaded: losing the session must not lose the lead.
  session_id   uuid references public.sessions (session_id) on delete set null,

  status       public.lead_status not null default 'new',
  value        numeric(12,2),
  currency     char(3),
  notes        text,

  -- frozen copy of attribution at submission
  source       text,
  medium       text,
  campaign     text,
  term         text,
  content      text,
  landing_page text,
  referrer     text,

  gclid        text,
  fbclid       text,
  ttclid       text,
  msclkid      text,

  consent      jsonb not null default '{}'::jsonb
);

create index leads_created_idx  on public.leads (created_at desc);
create index leads_status_idx   on public.leads (status, created_at desc);
create index leads_email_idx    on public.leads (email);
create index leads_source_idx   on public.leads (source, medium);
create index leads_campaign_idx on public.leads (campaign);
-- Drives the design's "has click id" filter without a table scan.
create index leads_has_click_idx on public.leads (created_at desc)
  where gclid is not null or fbclid is not null or ttclid is not null or msclkid is not null;

create trigger leads_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();
