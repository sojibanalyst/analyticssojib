-- "This site, tracked live": the handful of columns the public panel may read.
--
-- `events` has no anon policy and must not get one: a row carries a session
-- id, an event id, the params and the consent record. This view is the same
-- deliberate, auditable hole as public_site_settings (20260815020001), and
-- narrow for the same reason. A policy on the table would open every column,
-- present and future.
--
-- What it exposes, and what it refuses to:
--
--   event_name   only names on the list below. The collector accepts any
--                well-formed name from any browser, so without the list
--                anyone could post an event called whatever they liked and
--                watch it appear on the homepage.
--   page_path    with the query string and fragment cut off, because that is
--                where UTM values, click ids and anything else pasted into a
--                URL live. Then only paths that are real public pages, for
--                the same reason as the name list: the path is supplied by
--                the browser too.
--   at           received_at, the server's clock. occurred_at is the
--                browser's and can say anything.
--
-- No session id, no event id, no params, no consent, no IP (none is stored).
--
-- security_invoker is deliberately NOT set, so the view runs as its owner and
-- bypasses the table's RLS. That is the point of it.

create or replace view public.public_recent_events as
  select
    e.event_name,
    split_part(split_part(e.page_path, '?', 1), '#', 1) as page_path,
    e.received_at as at
  from public.events e
  where e.event_name = any (array[
      'page_view', 'cta_click', 'book_call_click', 'whatsapp_click',
      'case_study_view', 'review_video_play', 'scroll_depth', 'form_start',
      'generate_lead', 'tracking_check_run'
    ])
    and split_part(split_part(e.page_path, '?', 1), '#', 1)
        ~ '^/$|^/(blog|case-studies)(/[a-z0-9-]{1,80})?$|^/(book|privacy|terms|tracking-plan)$'
    and e.received_at > now() - interval '30 days'
  order by e.received_at desc
  limit 20;

comment on view public.public_recent_events is
  'The only event data the public site may read: an allowlisted name, a public path with no query string, and the server time. Add a column only after asking whether it belongs on the homepage.';

grant select on public.public_recent_events to anon, authenticated;
