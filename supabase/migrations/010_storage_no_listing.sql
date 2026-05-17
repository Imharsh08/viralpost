-- Migration 010: Tighten storage SELECT policy on post-images
-- Safe to re-run
--
-- Background: migration 008 created an open SELECT policy on storage.objects
-- for the post-images bucket. Supabase's security advisor flags this:
-- "Clients can list all files in this bucket". A public bucket only needs
-- direct-by-URL access; listing is unnecessary and leaks the catalogue of
-- every uploaded image to anyone.
--
-- Fix: replace the open SELECT policy with one that only matches when the
-- caller is the owner of the file's folder (their own UID prefix), AND
-- keep the bucket itself `public = true` so Supabase's storage REST handler
-- serves direct-URL GETs without checking RLS at all.
--
-- Net effect:
--   - GET /storage/v1/object/public/post-images/<path>  → still works for everyone
--   - LIST /storage/v1/object/list/post-images          → only your own files

DROP POLICY IF EXISTS "Anyone can view post images" ON storage.objects;

CREATE POLICY "Users can only list their own post images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'post-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
