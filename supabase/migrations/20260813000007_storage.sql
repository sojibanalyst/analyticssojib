-- Storage bucket for case-study screenshots and post images.
--
-- Public read, admin-only write. The bucket is public because these images are
-- served from marketing pages that must stay statically rendered — a signed URL
-- would expire and would force a per-request call on a public route.
--
-- Nothing sensitive belongs in here. Every image is reviewed for client
-- identifiers (postal addresses, account ids, internal hostnames) before it is
-- uploaded; see the rejected-page notes in DESIGN-NOTES.md.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  10485760,                                    -- 10 MB
  array['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/svg+xml']
)
on conflict (id) do nothing;

create policy media_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'media');

create policy media_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and public.is_admin());

create policy media_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and public.is_admin())
  with check (bucket_id = 'media' and public.is_admin());

create policy media_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and public.is_admin());
