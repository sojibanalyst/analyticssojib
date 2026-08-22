-- Unclaimed booking intents expire too.
--
-- Found while erasing the test rows, which is the only reason it was found: a
-- booking_intents row holds the full attribution INCLUDING the click id, and
-- one is written every time anybody clicks "book a call". Most are never
-- claimed — the person opened Calendly and did not book — so without this the
-- table becomes a permanent store of click ids belonging to people who never
-- became a lead, and nothing in the console would ever show them.
--
-- Same argument as the 30-day expiry on refused submissions, applied to the
-- table holding the more sensitive data. A booking that has not arrived within
-- a month is not going to; Calendly delivers its webhook in seconds.
--
-- CLAIMED intents are kept: they belong to a lead, and erase_lead deletes them
-- along with it. Purging a claimed one on a timer would quietly break that
-- link and leave a click id with no route to erasure.

alter table public.booking_intents
  add column expires_at timestamptz not null default (now() + interval '30 days');

create index booking_intents_expires_idx on public.booking_intents (expires_at)
  where claimed_at is null;

comment on column public.booking_intents.expires_at is
  'Unclaimed intents are purged after 30 days. Claimed ones stay, and are deleted by erase_lead along with the lead they belong to.';

-- Folded into the sweep that already runs when /admin/leads is opened, so
-- there is still nothing to schedule.
create or replace function public.purge_expired_rejections()
returns integer
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_rejections integer;
  v_intents    integer;
begin
  if not public.is_admin() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  delete from public.lead_rejections where expires_at < now();
  get diagnostics v_rejections = row_count;

  delete from public.booking_intents where claimed_at is null and expires_at < now();
  get diagnostics v_intents = row_count;

  if v_rejections > 0 then
    insert into public.deletion_log (actor, action, detail, affected)
    values (
      auth.jwt() ->> 'email',
      'rejections_expired',
      'Refused submissions past their 30-day retention.',
      v_rejections
    );
  end if;

  if v_intents > 0 then
    insert into public.deletion_log (actor, action, detail, affected)
    values (
      auth.jwt() ->> 'email',
      'booking_intents_expired',
      'Unclaimed booking intents past 30 days. Each held a click id for somebody who opened Calendly and never booked.',
      v_intents
    );
  end if;

  return v_rejections + v_intents;
end;
$$;

revoke all on function public.purge_expired_rejections() from public;
grant execute on function public.purge_expired_rejections() to authenticated;
