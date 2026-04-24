-- ============================================================
-- Story 2.3 follow-up fix (final): re-apply column-level GRANTs
-- after the REVOKE in 20260423000002.
--
-- Postgres semantics: REVOKE SELECT ON TABLE FROM role removes ALL
-- SELECT privileges including column-level grants. The previous
-- migration revoked correctly but left anon with nothing. This
-- migration grants back exactly the subset of columns that should
-- be public.
-- ============================================================

BEGIN;

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

COMMIT;
