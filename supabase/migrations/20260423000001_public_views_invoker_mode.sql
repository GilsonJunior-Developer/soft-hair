-- ============================================================
-- Story 2.3 follow-up: Harden public views per Supabase advisor
-- recommendation (lint 0010_security_definer_view).
--
-- Previous migration (20260423000000) created views with the
-- default security_invoker = FALSE — Postgres runs the view's
-- SELECT with the privileges of the view owner (postgres), which
-- bypasses RLS on the base tables. Supabase flags that as ERROR.
--
-- This migration converts the pattern to the Supabase-idiomatic
-- model:
--
--   1. Views run as the invoking role (security_invoker = TRUE)
--   2. Column-level GRANT SELECT gives anon access only to safe
--      columns on the base tables
--   3. RLS policies authorize anon to read rows where active and
--      not deleted
--
-- Net effect for anon:
--   SELECT * FROM public_salons_v                → works (via view)
--   SELECT id, name FROM salons WHERE deleted_at IS NULL → works
--   SELECT commission_default_percent FROM professionals → FAILS
--     (permission denied for column commission_default_percent)
--   SELECT * FROM salons                          → FAILS
--     (permission denied for non-granted columns)
-- ============================================================

BEGIN;

-- ----------------------------------------------------------
-- 1. Switch views to security_invoker = TRUE
-- ----------------------------------------------------------
ALTER VIEW public.public_salons_v        SET (security_invoker = TRUE);
ALTER VIEW public.public_professionals_v SET (security_invoker = TRUE);
ALTER VIEW public.public_services_v      SET (security_invoker = TRUE);

-- ----------------------------------------------------------
-- 2. Column-level GRANTs on base tables
--    Only whitelisted columns + filter columns (is_active,
--    deleted_at) are readable by anon. The filter columns
--    themselves contain no PII; they only leak the existence
--    count of active rows, which is exactly what the public
--    pages expose anyway.
-- ----------------------------------------------------------
GRANT SELECT (id, name, slug, city, deleted_at)
  ON public.salons TO anon;

GRANT SELECT (
  id, salon_id, slug, name, photo_url, bio, specialties,
  is_active, deleted_at
) ON public.professionals TO anon;

GRANT SELECT (
  id, salon_id, name, category, duration_minutes, price_brl,
  is_active, deleted_at
) ON public.services TO anon;

-- ----------------------------------------------------------
-- 3. RLS policies allowing anon to read active rows
--    Named with prefix `public_read_*` so they don't collide
--    with existing policies scoped to `authenticated` +
--    salon_id membership.
-- ----------------------------------------------------------
DROP POLICY IF EXISTS public_read_active_salons        ON public.salons;
DROP POLICY IF EXISTS public_read_active_professionals ON public.professionals;
DROP POLICY IF EXISTS public_read_active_services      ON public.services;

CREATE POLICY public_read_active_salons
  ON public.salons
  FOR SELECT
  TO anon
  USING (deleted_at IS NULL);

CREATE POLICY public_read_active_professionals
  ON public.professionals
  FOR SELECT
  TO anon
  USING (is_active = TRUE AND deleted_at IS NULL);

CREATE POLICY public_read_active_services
  ON public.services
  FOR SELECT
  TO anon
  USING (is_active = TRUE AND deleted_at IS NULL);

COMMIT;

-- ============================================================
-- Verification (run as anon after apply):
--   SELECT id, name FROM public_salons_v;             -- OK
--   SELECT id, name FROM salons WHERE deleted_at IS NULL; -- OK
--   SELECT * FROM salons;                              -- FAIL (columns not granted)
--   SELECT commission_default_percent FROM professionals; -- FAIL (column not granted)
--   SELECT owner_user_id FROM salons;                  -- FAIL (column not granted)
-- ============================================================
