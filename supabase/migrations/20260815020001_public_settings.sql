-- The GTM container id has to be readable by the public site.
--
-- Found by testing rather than by reading: after moving the container id out
-- of the bundle, the snippet rendered empty. `settings` has an admin-only RLS
-- policy and no anon policy at all — correct for a table holding a contact
-- email, an sGTM endpoint and a retention setting — so the public page's anon
-- client read nothing and, by design, rendered no container.
--
-- Fixed with a view exposing ONE column rather than an anon policy on the
-- table. A policy would open every column, present and future: the next
-- setting anyone adds would be public the moment it was added, which is
-- exactly the kind of quiet widening that gets missed in review.
--
-- security_invoker is deliberately NOT set, so the view runs as its owner and
-- bypasses the table's RLS. That is the point — it is a deliberate, auditable
-- hole exactly one column wide, and a container id is public by nature: it is
-- in the page source of every site running GTM.

create or replace view public.public_site_settings as
  select gtm_container_id
  from public.settings
  where id;

comment on view public.public_site_settings is
  'The only settings the public site may read. One column, on purpose — add to this view only after asking whether the value belongs in page source.';

grant select on public.public_site_settings to anon, authenticated;
