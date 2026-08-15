-- "Test connection" results.
--
-- A destination that has never been tested must say exactly that. The
-- alternative — showing nothing, or showing green because credentials are
-- present — implies health it has not demonstrated, which is the failure this
-- site exists to argue against: a token that was wrong all along, discovered
-- three weeks and several thousand conversions later.
--
-- Three columns rather than one status string, so "never tested" and "tested
-- and failed" cannot be confused with each other.

alter table public.destinations
  add column last_test_at      timestamptz,
  add column last_test_ok      boolean,
  add column last_test_message text;

comment on column public.destinations.last_test_ok is
  'NULL = never tested. Distinct from false, which means tested and failed.';
comment on column public.destinations.last_test_message is
  'Verbatim from the platform. Redacted on write — see redact_destination_error.';

-- The redaction trigger already covers last_error. A test result carries the
-- same hazard: GA4 echoes the request, and its api_secret is a query
-- parameter, so an unredacted validation message can contain the credential.
create or replace function public.redact_destination_error()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  pattern text := '(api_secret|access_token|token|key|password|secret)=[^&\s"'']+';
begin
  if new.last_error is not null then
    new.last_error := regexp_replace(new.last_error, pattern, '\1=[REDACTED]', 'gi');
  end if;

  if new.last_test_message is not null then
    new.last_test_message := regexp_replace(new.last_test_message, pattern, '\1=[REDACTED]', 'gi');
  end if;

  return new;
end;
$$;
