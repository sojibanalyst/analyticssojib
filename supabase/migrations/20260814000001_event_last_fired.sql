-- LAST FIRED on the Event map screen was always "—".
--
-- Cause, established by querying rather than guessing: `event_map.last_fired_at`
-- is never written. Nothing in the collector, the seed or the app has ever set
-- it, so 0 of 4 rows had a value while `events` plainly held the data
-- (page_view, 6 rows, a real max(occurred_at)). A dash there does not mean
-- "not recorded" — it reads as "never fired", which was false and the opposite
-- of what the screen exists to show.
--
-- Fixed with a view rather than by teaching the collector to update the
-- column. A denormalised timestamp has to be maintained on every write and
-- silently goes stale the first time someone forgets; a view is derived from
-- the events themselves and cannot disagree with them.

create or replace view public.event_last_fired
with (security_invoker = true) as
  select
    event_name,
    max(occurred_at) as last_fired_at,
    count(*)         as event_count
  from public.events
  group by event_name;

comment on view public.event_last_fired is
  'Derived from events. Replaces event_map.last_fired_at, which was never populated.';

-- security_invoker means this runs as the caller, so the events RLS policy
-- still applies: an admin sees it, anon does not. Without that flag a view
-- runs as its owner and would have handed the public a window onto every
-- event row.
grant select on public.event_last_fired to authenticated;

-- `event_map.last_fired_at` is left in place rather than dropped: it is
-- harmless, and dropping a column is the kind of forward-only change worth
-- doing on purpose rather than in passing. Nothing reads it any more.
comment on column public.event_map.last_fired_at is
  'Unused. Never populated; the Event map screen reads public.event_last_fired instead.';
