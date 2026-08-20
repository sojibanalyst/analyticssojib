-- Attribution that does not depend on sessions, and one event per lead.
--
-- THE COUPLING BEING BROKEN
--
-- Attribution was copied onto a lead from public.sessions. A session is only
-- created when analytics_storage is granted, and there is no consent interface
-- on the site, so no session is ever created, so every lead has arrived with
-- source, medium, campaign, landing_page and every click id null. The Leads
-- table shows "—" under First touch and always will, and
-- /admin/offline-conversions can never do its job, because "google_ads · needs
-- gclid" cannot be satisfied by a column nothing writes.
--
-- Attribution is now read server-side from the request URL and the Referer
-- header, frozen into a first-party HttpOnly cookie by proxy.ts, and passed to
-- this function by the enquiry form's server action. Nothing about it goes
-- through the session table, and nothing about it is read from JavaScript —
-- a page that could name its own source could credit any campaign it liked.
--
-- WHAT IS ADDED
--
--   wbraid, gbraid    Google's iOS web-to-app click ids. NOT interchangeable
--                     with gclid and not collapsible into it: a conversion
--                     uploaded against the wrong parameter is rejected, and
--                     these arrive on journeys gclid never sees.
--   li_fat_id         LinkedIn.
--   last_touch_*      The campaign that CLOSED the enquiry, kept apart from
--                     the one that discovered them. Two different questions.
--   attribution_status
--                     'captured' | 'direct' | 'unknown'. Empty is not the
--                     same as direct: 'direct' means the first request was
--                     seen and carried nothing, 'unknown' means nothing was
--                     ever seen — a blocked cookie, or a capture that failed.
--                     Collapsing them would report a failure as organic
--                     traffic, which is the specific lie this site sells
--                     fixing.

alter table public.leads
  add column wbraid    text,
  add column gbraid    text,
  add column li_fat_id text,

  add column last_touch_source   text,
  add column last_touch_medium   text,
  add column last_touch_campaign text,
  add column last_touch_term     text,
  add column last_touch_content  text,
  add column last_landing_page   text,
  add column last_referrer       text,

  add column first_seen_at timestamptz,
  add column attribution_status text not null default 'unknown'
    check (attribution_status in ('captured', 'direct', 'unknown'));

comment on column public.leads.attribution_status is
  'captured = parameters or a referrer were seen; direct = the first request was observed and carried nothing; unknown = nothing was ever observed, so this is a capture failure and must not be read as direct.';
comment on column public.leads.wbraid is
  'Google iOS web-to-app click id. Distinct from gclid — uploading one as the other is rejected.';

create index leads_last_touch_idx on public.leads (last_touch_source, last_touch_medium);
create index leads_attribution_status_idx on public.leads (attribution_status);

-- The click-id index has to know about the new parameters or the offline
-- conversions screen keeps missing the rows it exists to find.
drop index if exists public.leads_has_click_idx;
create index leads_has_click_idx on public.leads (created_at desc)
  where gclid is not null or fbclid is not null or ttclid is not null
     or msclkid is not null or wbraid is not null or gbraid is not null
     or li_fat_id is not null;

-- ---------------------------------------------------------------------------
-- submit_lead, replaced: attribution in, and the event written in the same
-- transaction as the lead.
-- ---------------------------------------------------------------------------
--
-- ONE PLACE, NOT TWO THAT CAN DISAGREE.
--
-- generate_lead was being written by the BROWSER, through /api/collect, with
-- an event id the browser generated — a different id from the one the server
-- returned and forwards to a destination. So the conversion existed twice
-- under two identities, which is precisely the double count that GA4 cannot
-- resolve, because GA4 does not deduplicate by event_id the way Meta and
-- TikTok do.
--
-- The lead row and its generate_lead event are now inserted together, here,
-- sharing one id. Either both exist or neither does. The browser no longer
-- creates the event; it only pushes the same id to the dataLayer.
--
-- The event row is written even though /api/collect would refuse to write one
-- without consent, and that difference is deliberate: a page view is
-- observation of a person who did not ask to be observed, and an enquiry is a
-- record of something a person chose to send. The consent value on the row
-- still records that nobody was asked.

create or replace function public.submit_lead(
  p_name        text,
  p_email       text,
  p_company     text default null,
  p_platform    text default null,
  p_answers     jsonb default '{}'::jsonb,
  p_session_id  uuid default null,
  p_attribution jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_session public.sessions%rowtype;
  v_lead_id uuid;
  v_name    text := btrim(p_name);
  v_email   text := lower(btrim(p_email));
  v_attr    jsonb := coalesce(p_attribution, '{}'::jsonb);
  v_first   jsonb := coalesce(v_attr -> 'first', '{}'::jsonb);
  v_last    jsonb := coalesce(v_attr -> 'last', '{}'::jsonb);
  v_status  text  := coalesce(v_attr ->> 'status', 'unknown');
begin
  if v_name = '' or length(v_name) > 120 then
    raise exception 'name_invalid' using errcode = '22023';
  end if;

  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or length(v_email) > 254 then
    raise exception 'email_invalid' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.leads
    where email = v_email::citext
      and created_at > now() - interval '60 seconds'
  ) then
    raise exception 'too_soon' using errcode = '22023';
  end if;

  if v_status not in ('captured', 'direct', 'unknown') then
    v_status := 'unknown';
  end if;

  -- Sessions are still read when one exists, so this keeps working unchanged
  -- the day consent comes back. It is no longer the only source.
  if p_session_id is not null then
    select * into v_session from public.sessions where session_id = p_session_id;
  end if;

  insert into public.leads (
    name, email, company, platform, answers, session_id,
    source, medium, campaign, term, content, landing_page, referrer,
    last_touch_source, last_touch_medium, last_touch_campaign,
    last_touch_term, last_touch_content, last_landing_page, last_referrer,
    gclid, fbclid, ttclid, msclkid, wbraid, gbraid, li_fat_id,
    first_seen_at, attribution_status, consent
  )
  values (
    v_name,
    v_email::citext,
    nullif(btrim(coalesce(p_company, '')), ''),
    nullif(btrim(coalesce(p_platform, '')), ''),
    coalesce(p_answers, '{}'::jsonb),
    v_session.session_id,

    -- First touch: the cookie when there is one, the session when there is
    -- not. coalesce rather than a branch so a site with both keeps the
    -- cookie's answer, which is the one that saw the landing page.
    coalesce(v_first ->> 'source',   v_session.first_touch_source),
    coalesce(v_first ->> 'medium',   v_session.first_touch_medium),
    coalesce(v_first ->> 'campaign', v_session.first_touch_campaign),
    coalesce(v_first ->> 'term',     v_session.first_touch_term),
    coalesce(v_first ->> 'content',  v_session.first_touch_content),
    coalesce(v_first ->> 'landing_page', v_session.landing_page),
    coalesce(v_first ->> 'referrer',     v_session.referrer),

    -- Last touch: what closed it.
    coalesce(v_last ->> 'source',   v_session.last_touch_source),
    coalesce(v_last ->> 'medium',   v_session.last_touch_medium),
    coalesce(v_last ->> 'campaign', v_session.last_touch_campaign),
    coalesce(v_last ->> 'term',     v_session.last_touch_term),
    coalesce(v_last ->> 'content',  v_session.last_touch_content),
    v_last ->> 'landing_page',
    v_last ->> 'referrer',

    -- Click ids: last touch wins, because the click that produced the
    -- enquiry is the one an ad platform will match the conversion against.
    coalesce(v_last ->> 'gclid',     v_first ->> 'gclid',     v_session.gclid),
    coalesce(v_last ->> 'fbclid',    v_first ->> 'fbclid',    v_session.fbclid),
    coalesce(v_last ->> 'ttclid',    v_first ->> 'ttclid',    v_session.ttclid),
    coalesce(v_last ->> 'msclkid',   v_first ->> 'msclkid',   v_session.msclkid),
    coalesce(v_last ->> 'wbraid',    v_first ->> 'wbraid'),
    coalesce(v_last ->> 'gbraid',    v_first ->> 'gbraid'),
    coalesce(v_last ->> 'li_fat_id', v_first ->> 'li_fat_id'),

    (v_attr ->> 'first_seen_at')::timestamptz,
    v_status,
    coalesce(v_session.consent, '{"status": "not_asked"}'::jsonb)
  )
  returning id into v_lead_id;

  -- The event, same transaction, same id. event_id is text and unique; the
  -- lead's uuid is used as the string so the two can never be told apart.
  insert into public.events (
    session_id, event_name, event_id, occurred_at, page_path, params, consent
  )
  values (
    v_session.session_id,
    'generate_lead',
    v_lead_id::text,
    now(),
    coalesce(v_last ->> 'landing_page', v_first ->> 'landing_page'),
    jsonb_build_object(
      'form', 'contact',
      'platform', nullif(btrim(coalesce(p_platform, '')), ''),
      'lead_id', v_lead_id
    ),
    coalesce(v_session.consent, '{"status": "not_asked"}'::jsonb)
  )
  on conflict (event_id) do nothing;

  return v_lead_id;
end;
$$;

revoke all on function public.submit_lead(text, text, text, text, jsonb, uuid, jsonb) from public;
grant execute on function public.submit_lead(text, text, text, text, jsonb, uuid, jsonb)
  to anon, authenticated;

-- The six-argument version is gone: leaving it callable would leave a second
-- door into this table that writes no attribution and no event.
drop function if exists public.submit_lead(text, text, text, text, jsonb, uuid);
