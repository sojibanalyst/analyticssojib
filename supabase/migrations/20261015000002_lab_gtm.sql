-- The tracking lab's own GTM container, set from the console.
--
-- /lab is a demo store for practising tracking. It never runs the site's real
-- container (components/GoogleTagManager.tsx skips it there). These two
-- columns are the only way to give the lab a container: an id, which builds
-- Google's standard snippet, or a pasted <head> snippet for a custom loader.
-- The head snippet wins when both are set, as on the main site.
--
-- Both are page source by nature, so they join public_site_settings.

alter table public.settings add column lab_gtm_container_id text;
alter table public.settings add column lab_gtm_head_code text;

alter table public.settings
  add constraint settings_lab_gtm_head_code_length
  check (lab_gtm_head_code is null or length(lab_gtm_head_code) <= 20000);

create or replace view public.public_site_settings as
  select gtm_container_id, gtm_head_code, lab_gtm_container_id, lab_gtm_head_code
  from public.settings
  where id;

comment on view public.public_site_settings is
  'The only settings the public site may read: the GTM container id and head snippet for the site, and the same two for the tracking lab. All are page source by nature. Add to this view only after asking whether the value belongs in page source.';
