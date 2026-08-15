-- A test can succeed and still prove nothing. Record which.
--
-- Added after measuring GA4's /debug/mp/collect against the live endpoint: it
-- returns an EMPTY validationMessages array — byte-for-byte what a correct
-- setup returns — for a bogus measurement_id AND a bogus api_secret. The
-- endpoint validates the payload shape; it deliberately does not validate the
-- credentials, so it cannot be used to enumerate valid measurement ids.
--
-- Two columns could not express that. `last_test_ok = true` would have shown a
-- green "Passed" beside a wrong API secret, which is precisely the failure the
-- Test button was added to prevent. So ok and conclusive are separate:
--
--   ok=false                 the platform rejected it — a real failure
--   ok=true,  conclusive     the platform confirmed the credentials
--   ok=true, !conclusive     the request was accepted; credentials unproven
--
-- Default true so every historical row keeps the meaning it was written with:
-- before this column existed, ok=true was only ever written by a test that
-- did verify (Meta, TikTok, sGTM).

alter table public.destinations
  add column last_test_conclusive boolean not null default true;

comment on column public.destinations.last_test_conclusive is
  'False when the request succeeded but did not verify the credentials — GA4 debug and Google Ads without OAuth. Rendered as "Inconclusive", never as a pass.';
