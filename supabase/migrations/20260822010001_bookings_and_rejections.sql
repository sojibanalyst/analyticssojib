-- Three things: nothing is silently discarded, bookings become leads, and the
-- click id survives a handoff that has no field for it.
--
-- WHAT WENT WRONG
--
-- A real enquiry was submitted on the live site and vanished. Reproduced on
-- production: fill the honeypot — which is what a browser autofill does to a
-- field labelled "Company website" — and the server action returns
-- "Thanks, I'll reply personally" and inserts nothing. No row, no error, no log
-- line. The visitor believes they have written to me and I never see it.
--
-- The honeypot stays; bots are real. What changes is that a rejection is now a
-- RECORD rather than a return statement.

-- ---------------------------------------------------------------------------
-- Rejected submissions
-- ---------------------------------------------------------------------------
create table public.lead_rejections (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  -- 'honeypot' | 'rate_limited' | 'invalid'
  reason      text not null,
  name        text,
  email       citext,
  company     text,
  platform    text,
  answers     jsonb not null default '{}'::jsonb,
  attribution jsonb not null default '{}'::jsonb,
  -- Set when a human decides this was a person, not a bot.
  reviewed_at timestamptz
);

create index lead_rejections_created_idx on public.lead_rejections (created_at desc);

comment on table public.lead_rejections is
  'Every submission the form refused, with what it refused and why. A rejection nobody can see is indistinguishable from a lost lead.';

alter table public.lead_rejections enable row level security;

create policy lead_rejections_admin_all on public.lead_rejections
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Booking intents — the click id stays on this side of the handoff
-- ---------------------------------------------------------------------------
--
-- Calendly's tracking object has exactly six fields: utm_source, utm_medium,
-- utm_campaign, utm_content, utm_term, salesforce_uuid. There is no gclid
-- field and there will not be one, so a booking can never carry the click id
-- that Google Ads offline conversion import requires.
--
-- Inverted: the attribution stays here, and Calendly is handed an opaque
-- reference in utm_content. The reference is meaningless to anyone who sees it
-- — deliberately not the gclid itself, which ends up in a third party's
-- database and in a URL, and is worth nothing to us there and something to
-- someone else.
create table public.booking_intents (
  ref         text primary key,
  created_at  timestamptz not null default now(),
  attribution jsonb not null default '{}'::jsonb,
  landing_page text,
  referrer     text,
  -- Set when a booking arrives quoting this reference. Kept rather than
  -- deleted: a second webhook delivery for the same booking must find it.
  claimed_at  timestamptz
);

create index booking_intents_created_idx on public.booking_intents (created_at desc);

comment on table public.booking_intents is
  'One row per click on Book a call. Holds the full attribution including the click id; Calendly only ever sees the ref.';

alter table public.booking_intents enable row level security;

create policy booking_intents_admin_read on public.booking_intents
  for select to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Leads gain a booking identity
-- ---------------------------------------------------------------------------
alter table public.leads
  -- Calendly's invitee URI. UNIQUE is the idempotency key: Calendly retries
  -- webhook deliveries, and a retry must not create a second lead or a second
  -- generate_lead event.
  add column calendly_invitee_uri text unique,
  add column calendly_event_uri   text,
  add column booked_at            timestamptz,
  add column canceled_at          timestamptz,
  add column cancel_reason        text,
  -- 'form' | 'booking'. Two ways in, and the console should not have to guess
  -- from which columns happen to be null.
  add column origin text not null default 'form'
    check (origin in ('form', 'booking'));

create index leads_origin_idx on public.leads (origin, created_at desc);

comment on column public.leads.calendly_invitee_uri is
  'Idempotency key for the Calendly webhook. One booking, one lead, however many times Calendly delivers it.';
