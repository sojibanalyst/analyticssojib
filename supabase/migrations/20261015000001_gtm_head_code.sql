-- The GTM <head> snippet, pasted as is from Tag Manager.
--
-- The container id field builds Google's standard snippet. Some setups need
-- the code exactly as GTM (or a server-side host such as Stape) gives it: a
-- custom loader domain, a renamed script, extra parameters. This column holds
-- that code. When it is set the site renders it in <head> instead of the
-- id-built snippet, still below the Consent Mode defaults.
--
-- Public by nature: the snippet is in the page source of every page that runs
-- it, so it joins gtm_container_id in public_site_settings. The console only
-- accepts <script> tags here (checked in updateSettings), and the length is
-- capped so a paste cannot swell every page.

alter table public.settings add column gtm_head_code text;

alter table public.settings
  add constraint settings_gtm_head_code_length
  check (gtm_head_code is null or length(gtm_head_code) <= 20000);

create or replace view public.public_site_settings as
  select gtm_container_id, gtm_head_code
  from public.settings
  where id;

comment on view public.public_site_settings is
  'The only settings the public site may read: the GTM container id and the GTM head snippet, both of which are page source by nature. Add to this view only after asking whether the value belongs in page source.';
