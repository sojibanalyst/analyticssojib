-- Destination credentials, editable from the console.
--
-- Two kinds of value, deliberately not treated the same:
--
--   PUBLIC ids  (GA4 measurement_id, a Meta pixel id) live in `config` jsonb.
--               They are visible in the page source of any site running the
--               tag, so hiding them would be theatre.
--
--   SECRETS     (GA4 api_secret, Meta/Ads/TikTok access tokens) go into
--               Supabase Vault. The row keeps only a pointer and enough
--               metadata to describe the secret without revealing it.
--
-- Vault rather than an ENCRYPTION_KEY env var and hand-rolled crypto:
--
--   * The key is held by Supabase outside the database. A pg_dump yields
--     ciphertext and nothing else — which is the requirement.
--   * It is XChaCha20-Poly1305 AEAD via pgsodium. Standard, authenticated,
--     and not written by me.
--   * The key never passes through application code, so it cannot end up in
--     a log line, a stack trace or a client bundle. An ENCRYPTION_KEY in the
--     app process can.
--   * Rotation is Supabase's job rather than a migration I have to write.
--
-- The cost, stated: decrypting needs a privileged role, so the fan-out worker
-- must read through service_role. It already does — getAdminClient is
-- designated for the collector and the fan-out worker.

alter table public.destinations
  add column secret_vault_id  uuid,
  add column secret_last4     text,
  add column secret_updated_at timestamptz;

comment on column public.destinations.secret_vault_id is
  'Pointer into vault.secrets. The secret itself is never stored on this row.';
comment on column public.destinations.secret_last4 is
  'Last 4 characters, for the "Configured · ••••1234" status line. Not enough to use.';

-- ---------------------------------------------------------------------------
-- Writing a secret. Admin-callable.
--
-- security definer because `authenticated` has no rights in the vault schema
-- and is not getting any: the only vault access the console has is through
-- this function, which writes and never reads back.
-- ---------------------------------------------------------------------------
create or replace function public.set_destination_secret(
  p_key    text,
  p_secret text
)
returns void
language plpgsql
security definer
set search_path = public, vault, extensions, pg_temp
as $$
declare
  v_dest   public.destinations%rowtype;
  v_secret text := btrim(p_secret);
  v_name   text;
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;

  -- An empty submission is "leave it alone", never "delete it". The form
  -- renders the field blank every time by design, so treating blank as a wipe
  -- would erase the secret on any unrelated save.
  if v_secret = '' then
    return;
  end if;

  select * into v_dest from public.destinations where key = p_key;
  if not found then
    raise exception 'unknown_destination' using errcode = '22023';
  end if;

  -- Namespaced so several destinations can hold secrets side by side; vault
  -- names are unique across the project.
  v_name := 'destination:' || p_key || ':secret';

  if v_dest.secret_vault_id is null then
    v_dest.secret_vault_id := vault.create_secret(v_secret, v_name, 'Set from /admin/destinations');
  else
    perform vault.update_secret(v_dest.secret_vault_id, v_secret, v_name, 'Rotated from /admin/destinations');
  end if;

  update public.destinations
  set secret_vault_id   = v_dest.secret_vault_id,
      -- Four characters is enough to recognise which credential is loaded and
      -- far too few to use. Short secrets get no tail at all rather than most
      -- of themselves.
      secret_last4      = case when length(v_secret) >= 12
                               then right(v_secret, 4) else null end,
      secret_updated_at = now()
  where key = p_key;
end;
$$;

-- ---------------------------------------------------------------------------
-- Removing a secret. Admin-callable.
-- ---------------------------------------------------------------------------
create or replace function public.clear_destination_secret(p_key text)
returns void
language plpgsql
security definer
set search_path = public, vault, extensions, pg_temp
as $$
declare
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;

  select secret_vault_id into v_id from public.destinations where key = p_key;

  update public.destinations
  set secret_vault_id = null, secret_last4 = null, secret_updated_at = null
  where key = p_key;

  if v_id is not null then
    delete from vault.secrets where id = v_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Reading a secret. NOT admin-callable — service_role only.
--
-- This is the line that makes the field write-only. An admin's browser session
-- authenticates as `authenticated`; if that role could execute this, a
-- write-only input would be one fetch away from being readable. Only the
-- server-side fan-out worker, which holds the service role key, can call it.
-- ---------------------------------------------------------------------------
create or replace function public.get_destination_secret(p_key text)
returns text
language sql
stable
security definer
set search_path = public, vault, extensions, pg_temp
as $$
  select s.decrypted_secret
  from public.destinations d
  join vault.decrypted_secrets s on s.id = d.secret_vault_id
  where d.key = p_key;
$$;

revoke all on function public.set_destination_secret(text, text)   from public, anon;
revoke all on function public.clear_destination_secret(text)       from public, anon;
revoke all on function public.get_destination_secret(text)         from public, anon, authenticated;

grant execute on function public.set_destination_secret(text, text) to authenticated;
grant execute on function public.clear_destination_secret(text)     to authenticated;
grant execute on function public.get_destination_secret(text)       to service_role;

-- ---------------------------------------------------------------------------
-- Redaction at the last possible moment.
--
-- The GA4 Measurement Protocol takes the api_secret as a QUERY PARAMETER, so
-- a failed call that logs its request URL leaks the credential into
-- `last_error` — which the Destinations screen then renders. Redacting in the
-- application would work until the day someone writes to this column from
-- somewhere else, so it is enforced here instead, where it cannot be skipped.
-- ---------------------------------------------------------------------------
create or replace function public.redact_destination_error()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.last_error is not null then
    new.last_error := regexp_replace(
      new.last_error,
      '(api_secret|access_token|token|key|password|secret)=[^&\s"'']+',
      '\1=[REDACTED]',
      'gi'
    );
  end if;
  return new;
end;
$$;

create trigger destinations_redact_error
  before insert or update on public.destinations
  for each row execute function public.redact_destination_error();
