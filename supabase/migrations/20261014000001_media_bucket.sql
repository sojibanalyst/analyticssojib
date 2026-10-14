-- Screenshots uploaded from the console.
--
-- Until now a screenshot could only be added by saving it under
-- portfolio-raw/ and running `npm run portfolio:images`, then deploying. The
-- console's Media tab uploads instead: a Server Action converts the file to
-- WebP (max 1600px wide, quality 78, as the script does) and stores it here,
-- then adds { src, alt, width, height } to the item.
--
-- A PUBLIC bucket: the site shows these files to every visitor, so they are
-- read by URL with no policy needed. Writing is the admin's alone, through the
-- same is_admin() every table policy uses, and the upload goes through the
-- admin's own session, never the service role.
--
-- Projects keep their images in portfolio_items.images, as now. Case studies
-- already have case_study_shots (storage_path, alt_text, caption, section,
-- sort_order), which the public pages read, so they need no new column: the
-- Media tab writes rows there.
--
-- The script and the files under public/portfolio keep working unchanged.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portfolio', 'portfolio', true, 10485760, array['image/webp'])
on conflict (id) do nothing;

create policy portfolio_media_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'portfolio' and public.is_admin());

create policy portfolio_media_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'portfolio' and public.is_admin())
  with check (bucket_id = 'portfolio' and public.is_admin());

create policy portfolio_media_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'portfolio' and public.is_admin());
