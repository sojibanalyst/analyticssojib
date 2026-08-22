-- Archive, erase, expire — and a record that any of it happened.
--
-- /admin/leads had a status dropdown and nothing else. Four test rows could
-- not be removed, and neither could a real person's enquiry if they asked me
-- to delete it. For a business targeting UK and EU clients that is not a
-- missing button, it is an obligation with no interface.
--
-- TWO OPERATIONS, NOT ONE, BECAUSE THEY MEAN DIFFERENT THINGS
--
--   archive  I am finished with this lead. It leaves the working list and
--            keeps everything: the attribution, the click ids, the event.
--            Reversible. This is what "delete" means nine times out of ten,
--            and a business record should not be destroyed to get it off a
--            screen.
--
--   erase    this must genuinely not exist. A deletion request, or a test row.
--            Irreversible, and it takes the personal data with it — including
--            the click ids, because a gclid is a person's click and erasing
--            the enquiry while keeping the gclid would be erasure in name
--            only.
--
-- WHAT ERASURE DOES TO THE TRACKING HISTORY
--
-- The generate_lead event is KEPT and stripped, not deleted. A conversion that
-- happened, happened: deleting the event would quietly change last month's
-- numbers, and this site exists to argue against numbers that move when
-- nobody is looking. What the event loses is everything that points at a
-- person — the lead_id parameter and a page_path that may carry a gclid in its
-- query string. What it keeps is that one lead was created, and when.
--
-- The booking_intents row for a booked lead is deleted outright: it holds the
-- full attribution including the click id and nothing else of value.

alter table public.leads
  add column archived_at timestamptz,
  -- The booking_intents reference this lead came from, so erasure can find and
  -- delete the row holding its click id. Without it there is no link back:
  -- the webhook resolves ref -> attribution and then forgets the ref.
  add column booking_ref text;

create index leads_archived_idx on public.leads (archived_at) where archived_at is not null;

comment on column public.leads.archived_at is
  'Set by archive_lead. Archived leads keep everything and leave the default list; erasure is a different operation.';

-- Refused submissions expire. There is no reason to hold a bot's junk for a
-- year, and every reason not to hold a stranger's name and email that long.
alter table public.lead_rejections
  add column expires_at timestamptz not null default (now() + interval '30 days');

create index lead_rejections_expires_idx on public.lead_rejections (expires_at);

comment on column public.lead_rejections.expires_at is
  '30 days. Long enough to notice a real person the honeypot caught by mistake — that conversation happens in days, not months — and short enough that this table is not a permanent store of other people''s details.';

-- ---------------------------------------------------------------------------
-- The record that a deletion happened
-- ---------------------------------------------------------------------------
--
-- A row vanishing with no trace is how a console starts lying. This log is
-- deliberately NOT a shadow copy: it holds a masked address, never the
-- address, because a log that reproduces the data defeats the erasure it is
-- recording.
create table public.deletion_log (
  id         uuid primary key default gen_random_uuid(),
  at         timestamptz not null default now(),
  actor      text,
  -- 'lead_archived' | 'lead_restored' | 'lead_erased' | 'rejection_erased'
  -- | 'rejection_rescued' | 'rejections_expired'
  action     text not null,
  subject_id uuid,
  -- e.g. "z…l@analyticssojib.com". Enough to recognise a row you deleted on
  -- purpose, not enough to reconstitute the person.
  subject    text,
  detail     text,
  affected   integer not null default 1
);

create index deletion_log_at_idx on public.deletion_log (at desc);

comment on table public.deletion_log is
  'Every archive, erasure and expiry. Masked subjects only — a log that reproduced the data would defeat the erasure it records.';

alter table public.deletion_log enable row level security;

create policy deletion_log_admin_read on public.deletion_log
  for select to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Functions. security definer so the multi-table work is atomic, with the
-- admin check inside rather than assumed from the caller.
-- ---------------------------------------------------------------------------

create or replace function public.mask_email(p_email text)
returns text
language sql
immutable
as $$
  select case
    when p_email is null or position('@' in p_email) = 0 then null
    else left(split_part(p_email, '@', 1), 1) || '…'
         || right(split_part(p_email, '@', 1), 1) || '@'
         || split_part(p_email, '@', 2)
  end;
$$;

create or replace function public.archive_lead(p_id uuid, p_restore boolean default false)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_email text;
begin
  if not public.is_admin() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  update public.leads
  set archived_at = case when p_restore then null else now() end
  where id = p_id
  returning email::text into v_email;

  if v_email is null then return null; end if;

  insert into public.deletion_log (actor, action, subject_id, subject)
  values (
    auth.jwt() ->> 'email',
    case when p_restore then 'lead_restored' else 'lead_archived' end,
    p_id,
    public.mask_email(v_email)
  );

  return p_id;
end;
$$;

create or replace function public.erase_lead(p_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_email text;
  v_ref   text;
begin
  if not public.is_admin() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  select email::text, booking_ref into v_email, v_ref
  from public.leads where id = p_id;

  if v_email is null then return null; end if;

  -- The event stays as a counted conversion and loses everything personal.
  -- page_path can carry a gclid in its query string, so it goes entirely
  -- rather than being trimmed to something that looks safe.
  update public.events
  set page_path = null,
      params = jsonb_build_object('form', params ->> 'form', 'erased', true)
  where event_id = p_id::text;

  -- Holds the full attribution including the click id, and nothing else worth
  -- keeping once the lead it belongs to is gone.
  if v_ref is not null then
    delete from public.booking_intents where ref = v_ref;
  end if;

  delete from public.leads where id = p_id;

  insert into public.deletion_log (actor, action, subject_id, subject, detail)
  values (
    auth.jwt() ->> 'email',
    'lead_erased',
    p_id,
    public.mask_email(v_email),
    'Lead row deleted. generate_lead event kept as a conversion and stripped of identifiers.'
  );

  return p_id;
end;
$$;

create or replace function public.erase_rejection(p_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_email text;
begin
  if not public.is_admin() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  delete from public.lead_rejections where id = p_id returning email::text into v_email;
  if v_email is null then return null; end if;

  insert into public.deletion_log (actor, action, subject_id, subject)
  values (auth.jwt() ->> 'email', 'rejection_erased', p_id, public.mask_email(v_email));

  return p_id;
end;
$$;

-- Rescue: a refused submission was a real person. Becomes a lead, keeping the
-- attribution that was captured with it, and leaves the refused list — so
-- deleting is not the only way to clear one.
create or replace function public.rescue_rejection(p_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  r public.lead_rejections%rowtype;
  v_lead_id uuid;
  v_first jsonb;
  v_last  jsonb;
begin
  if not public.is_admin() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  select * into r from public.lead_rejections where id = p_id;
  if r.id is null then return null; end if;
  if r.email is null then
    raise exception 'no_email' using errcode = '22023';
  end if;

  v_first := coalesce(r.attribution -> 'first', '{}'::jsonb);
  v_last  := coalesce(r.attribution -> 'last', '{}'::jsonb);

  insert into public.leads (
    name, email, company, platform, answers, status, origin,
    source, medium, campaign, term, content, landing_page, referrer,
    gclid, fbclid, ttclid, msclkid, wbraid, gbraid, li_fat_id,
    attribution_status, consent
  )
  values (
    coalesce(r.name, 'Rescued submission'),
    r.email,
    r.company,
    r.platform,
    r.answers,
    'new',
    'form',
    v_first ->> 'source',
    v_first ->> 'medium',
    v_first ->> 'campaign',
    v_first ->> 'term',
    v_first ->> 'content',
    v_first ->> 'landing_page',
    v_first ->> 'referrer',
    coalesce(v_last ->> 'gclid',     v_first ->> 'gclid'),
    coalesce(v_last ->> 'fbclid',    v_first ->> 'fbclid'),
    coalesce(v_last ->> 'ttclid',    v_first ->> 'ttclid'),
    coalesce(v_last ->> 'msclkid',   v_first ->> 'msclkid'),
    coalesce(v_last ->> 'wbraid',    v_first ->> 'wbraid'),
    coalesce(v_last ->> 'gbraid',    v_first ->> 'gbraid'),
    coalesce(v_last ->> 'li_fat_id', v_first ->> 'li_fat_id'),
    coalesce(r.attribution ->> 'status', 'unknown'),
    '{"status": "not_asked"}'::jsonb
  )
  returning id into v_lead_id;

  -- No generate_lead event: the conversion did not happen when the form was
  -- refused, and inventing one now would date it wrongly and inflate the day
  -- it was rescued on.
  delete from public.lead_rejections where id = p_id;

  insert into public.deletion_log (actor, action, subject_id, subject, detail)
  values (
    auth.jwt() ->> 'email',
    'rejection_rescued',
    v_lead_id,
    public.mask_email(r.email::text),
    'Refused submission promoted to a lead. No generate_lead event: the conversion did not happen when it was refused.'
  );

  return v_lead_id;
end;
$$;

-- Expiry, run opportunistically when the Leads page is opened. No scheduler to
-- depend on, and the only cost is one bounded DELETE on a page an admin is
-- already loading.
create or replace function public.purge_expired_rejections()
returns integer
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_count integer;
begin
  if not public.is_admin() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  delete from public.lead_rejections where expires_at < now();
  get diagnostics v_count = row_count;

  if v_count > 0 then
    insert into public.deletion_log (actor, action, detail, affected)
    values (
      auth.jwt() ->> 'email',
      'rejections_expired',
      'Refused submissions past their 30-day retention.',
      v_count
    );
  end if;

  return v_count;
end;
$$;

revoke all on function public.archive_lead(uuid, boolean) from public;
revoke all on function public.erase_lead(uuid) from public;
revoke all on function public.erase_rejection(uuid) from public;
revoke all on function public.rescue_rejection(uuid) from public;
revoke all on function public.purge_expired_rejections() from public;

grant execute on function public.archive_lead(uuid, boolean) to authenticated;
grant execute on function public.erase_lead(uuid) to authenticated;
grant execute on function public.erase_rejection(uuid) to authenticated;
grant execute on function public.rescue_rejection(uuid) to authenticated;
grant execute on function public.purge_expired_rejections() to authenticated;
