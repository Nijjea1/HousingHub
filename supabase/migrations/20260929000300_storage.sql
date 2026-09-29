-- Public image buckets. Files are stored under "<user id>/<file name>" and a
-- user may only write inside their own folder.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
    ('listing-images', 'listing-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
    ('profile-pictures', 'profile-pictures', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Images are publicly readable" on storage.objects;
create policy "Images are publicly readable" on storage.objects
    for select using (bucket_id in ('listing-images', 'profile-pictures'));

drop policy if exists "Users can upload to their own folder" on storage.objects;
create policy "Users can upload to their own folder" on storage.objects
    for insert to authenticated with check (
        bucket_id in ('listing-images', 'profile-pictures')
        and (storage.foldername(name))[1] = auth.uid()::text
    );

drop policy if exists "Users can update their own files" on storage.objects;
create policy "Users can update their own files" on storage.objects
    for update to authenticated using (
        bucket_id in ('listing-images', 'profile-pictures')
        and (storage.foldername(name))[1] = auth.uid()::text
    );

drop policy if exists "Users can delete their own files" on storage.objects;
create policy "Users can delete their own files" on storage.objects
    for delete to authenticated using (
        bucket_id in ('listing-images', 'profile-pictures')
        and (storage.foldername(name))[1] = auth.uid()::text
    );
