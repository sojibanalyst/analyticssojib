-- Extensions and the helpers every later migration leans on.
-- Forward-only: once this has run, never edit it — add a new migration.

create extension if not exists citext;

-- ---------------------------------------------------------------------------
-- Who counts as an admin.
--
-- A table rather than a hard-coded list inside is_admin(), so changing the
-- allowlist is an insert instead of a schema migration. It is deliberately
-- unreadable to anon and authenticated alike: only service_role touches it,
-- and is_admin() is security definer so it can still read it while running as
-- the caller.
-- ---------------------------------------------------------------------------
create table if not exists public.admin_emails (
  email      citext primary key,
  note       text,
  created_at timestamptz not null default now()
);

alter table public.admin_emails enable row level security;
-- No policies at all = default deny for every role except service_role.

comment on table public.admin_emails is
  'Allowlist for /admin. Mirrors ADMIN_EMAILS in lib/auth.ts — keep them in step.';

-- ---------------------------------------------------------------------------
-- is_admin()
--
-- The single predicate every RLS policy calls. Reads the email out of the JWT
-- rather than trusting anything the client sends.
--
-- security definer + a pinned search_path: without the pin, a caller who can
-- create objects could shadow `public` and make this return true.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.admin_emails a
    where a.email = (auth.jwt() ->> 'email')::citext
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, anon;

-- ---------------------------------------------------------------------------
-- updated_at, maintained by the database so no application path can forget it.
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Seed the allowlist. Adding a second admin later is one insert.
insert into public.admin_emails (email, note)
values ('sojibh2001@gmail.com', 'owner')
on conflict (email) do nothing;
