-- =========================================================
-- SoftHair — Storage bucket for professional photos
-- Migration: 20260421000003_storage_professional_photos
-- Author: Dex (Dev Agent) — Story 1.5 Task 1
-- Generated: 2026-04-21
-- Context: Professionals can have an optional photo. Public read
--          (shared via link público). Upload restricted to salon members.
-- =========================================================

BEGIN;

-- ---------------------------------------------------------
-- Create bucket (idempotent)
-- ---------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'professional-photos',
  'professional-photos',
  TRUE,                                             -- public read
  524288,                                           -- 512 KB hard cap (server-side)
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ---------------------------------------------------------
-- RLS policies on storage.objects
-- ---------------------------------------------------------
-- Path convention: professional-photos/{salon_id}/{professional_id}/{filename}

-- Drop if re-running
DROP POLICY IF EXISTS professional_photos_public_read ON storage.objects;
DROP POLICY IF EXISTS professional_photos_authenticated_upload ON storage.objects;
DROP POLICY IF EXISTS professional_photos_authenticated_update ON storage.objects;
DROP POLICY IF EXISTS professional_photos_authenticated_delete ON storage.objects;

-- Public read
CREATE POLICY professional_photos_public_read
  ON storage.objects FOR SELECT
  USING (bucket_id = 'professional-photos');

-- Upload: only salon members can write into their salon's folder
CREATE POLICY professional_photos_authenticated_upload
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'professional-photos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1]::UUID IN (
      SELECT public.current_user_salon_ids()
    )
  );

-- Update (replace): same condition
CREATE POLICY professional_photos_authenticated_update
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'professional-photos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1]::UUID IN (
      SELECT public.current_user_salon_ids()
    )
  );

-- Delete: same condition
CREATE POLICY professional_photos_authenticated_delete
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'professional-photos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1]::UUID IN (
      SELECT public.current_user_salon_ids()
    )
  );

COMMIT;
