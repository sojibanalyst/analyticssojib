-- Clears the security advisor. Every item here came from
-- `supabase advisors --type security` after 0001–0007 had run.

-- ---------------------------------------------------------------------------
-- 1. citext out of `public`
--
-- Anything in `public` is reachable through PostgREST. citext only needs to
-- exist, not to be exposed, so it moves to the `extensions` schema Supabase
-- already provisions.
--
-- Existing citext columns are unaffected — a column stores the type's OID, not
-- its schema-qualified name. But NEW migrations must write `extensions.citext`
-- explicitly, because `extensions` is not on the migration runner's
-- search_path.
-- ---------------------------------------------------------------------------
alter extension citext set schema extensions;

-- is_admin() casts to citext, so its pinned search_path has to follow.
-- Rewritten in full rather than patched: `alter function … set search_path`
-- would leave the body's own resolution rules unstated in this file.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select exists (
    select 1
    from public.admin_emails a
    where a.email = (auth.jwt() ->> 'email')::citext
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. anon must not reach is_admin()
--
-- `create or replace` resets the grants, so both lines below are required, not
-- just the revoke. No anon policy calls is_admin() — the public read policies
-- test `status = 'published'` and nothing else — so anon loses an RPC endpoint
-- and gains no restriction.
--
-- `authenticated` keeps EXECUTE and must: RLS evaluates the policy as the
-- calling role, so without this grant every admin policy would error instead
-- of denying. It leaks nothing — a signed-in user can only learn whether they
-- themselves are an admin, which they can already tell by loading /admin.
-- ---------------------------------------------------------------------------
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. admin_emails has RLS on and no policies — reported as INFO, and correct.
--
-- Default deny is the intent. The allowlist is edited with service_role or
-- from the SQL editor; no browser session, admin or not, can read it.
-- Recorded here so the next person to see the advisor knows it was a decision.
-- ---------------------------------------------------------------------------
