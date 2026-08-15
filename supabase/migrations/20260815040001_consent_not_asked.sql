-- Consent has three states, and the default has to be one of them.
--
-- The consent banner has been removed from the site, permanently. The column
-- stays, because /admin/events showing an honest consent value is part of the
-- product, and because a CMP has to go back in before GA4 or Google Ads runs
-- against EEA or UK traffic — at which point this field starts carrying real
-- answers again with no schema change.
--
-- What changes is the default. It was '{}', which reads as "no consent data",
-- and that is indistinguishable from a row written before consent was recorded
-- at all. '{"status": "not_asked"}' says the thing that is actually true:
-- nobody was shown a choice, so nothing was granted and nothing was refused.
--
-- Existing rows are left exactly as they are. They were collected while a
-- banner existed and their values are the historical truth; rewriting them to
-- not_asked would be falsifying the record this column exists to keep.

alter table public.events
  alter column consent set default '{"status": "not_asked"}'::jsonb;

alter table public.sessions
  alter column consent set default '{"status": "not_asked"}'::jsonb;

comment on column public.events.consent is
  'Consent Mode v2 state at the moment of the event. {"status":"not_asked"} means no consent interface existed — distinct from a recorded refusal, which carries status "asked" and analytics_storage "denied".';
