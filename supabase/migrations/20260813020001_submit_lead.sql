-- The public form's only way into the database.
--
-- `leads` has no anon policy and is not getting one. A policy that lets the
-- internet INSERT into a table lets it choose every column in that table —
-- including `status`, `value` and `notes`, which are the console's, not the
-- visitor's. Column-level grants could fence that off, but they would still
-- leave attribution up to whatever the browser claimed.
--
-- A security definer function is the narrow alternative: it accepts exactly
-- six values, decides the rest itself, and is the only thing anon may call.
-- This is not "getting around RLS" — it is an explicit, auditable API with a
-- smaller surface than a policy would have.

create or replace function public.submit_lead(
  p_name       text,
  p_email      text,
  p_company    text default null,
  p_platform   text default null,
  p_answers    jsonb default '{}'::jsonb,
  p_session_id uuid default null
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
begin
  if v_name = '' or length(v_name) > 120 then
    raise exception 'name_invalid' using errcode = '22023';
  end if;

  -- Deliberately loose. Strict email regexes reject valid addresses, and the
  -- only real proof an address works is mail arriving at it.
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or length(v_email) > 254 then
    raise exception 'email_invalid' using errcode = '22023';
  end if;

  -- Double-submit and crude flooding. A person does not send two enquiries in
  -- a minute; a script does. Not a substitute for a rate limiter, but it costs
  -- one index lookup and stops the common case.
  if exists (
    select 1 from public.leads
    where email = v_email::citext
      and created_at > now() - interval '60 seconds'
  ) then
    raise exception 'too_soon' using errcode = '22023';
  end if;

  -- Attribution is read from the session server-side and frozen onto the lead.
  -- It is never taken from the request: a browser that could name its own
  -- source could credit any campaign it liked.
  if p_session_id is not null then
    select * into v_session from public.sessions where session_id = p_session_id;
  end if;

  insert into public.leads (
    name, email, company, platform, answers, session_id,
    source, medium, campaign, term, content, landing_page, referrer,
    gclid, fbclid, ttclid, msclkid, consent
  )
  values (
    v_name,
    v_email::citext,
    nullif(btrim(coalesce(p_company, '')), ''),
    nullif(btrim(coalesce(p_platform, '')), ''),
    coalesce(p_answers, '{}'::jsonb),
    v_session.session_id,
    -- First touch, not last: the lead is credited to whatever originally
    -- found them, which is the number that should drive spend.
    v_session.first_touch_source,
    v_session.first_touch_medium,
    v_session.first_touch_campaign,
    v_session.first_touch_term,
    v_session.first_touch_content,
    v_session.landing_page,
    v_session.referrer,
    v_session.gclid,
    v_session.fbclid,
    v_session.ttclid,
    v_session.msclkid,
    coalesce(v_session.consent, '{}'::jsonb)
  )
  returning id into v_lead_id;

  return v_lead_id;
end;
$$;

-- anon and authenticated may call it; nobody may read the table through it.
revoke all on function public.submit_lead(text, text, text, text, jsonb, uuid) from public;
grant execute on function public.submit_lead(text, text, text, text, jsonb, uuid)
  to anon, authenticated;
