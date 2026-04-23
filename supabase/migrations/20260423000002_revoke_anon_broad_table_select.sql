-- ============================================================
-- Story 2.3 follow-up fix: REVOKE broad anon table-level SELECT
--
-- Context: Supabase default config grants SELECT on all tables
-- in schema `public` to the `anon` role. The previous migration
-- (20260423000001) added column-level GRANTs intending to restrict
-- what anon can read — but column-level grants are ADDITIVE on top
-- of any table-level grant. The broader grant still applies, so
-- anon could `SELECT *` and leak every column of rows allowed by
-- the new RLS policy.
--
-- Fix: REVOKE the table-level SELECT for anon. The column-level
-- GRANTs from 20260423000001 remain in place and become effective.
--
-- `authenticated` is intentionally left untouched — salon owners
-- and members need broad SELECT on their own salon's data.
-- ============================================================

BEGIN;

REVOKE SELECT ON public.salons        FROM anon;
REVOKE SELECT ON public.professionals FROM anon;
REVOKE SELECT ON public.services      FROM anon;

-- (Column-level GRANTs from migration 20260423000001 stay in effect:
--   salons        → (id, name, slug, city, deleted_at)
--   professionals → (id, salon_id, slug, name, photo_url, bio,
--                    specialties, is_active, deleted_at)
--   services      → (id, salon_id, name, category, duration_minutes,
--                    price_brl, is_active, deleted_at))

COMMIT;

-- ============================================================
-- Verification (run as anon after apply):
--   SELECT id, name FROM salons WHERE deleted_at IS NULL; -- OK
--   SELECT * FROM salons LIMIT 1;                          -- FAIL
--   SELECT owner_user_id FROM salons LIMIT 1;              -- FAIL
--   SELECT commission_default_percent FROM professionals
--     LIMIT 1;                                             -- FAIL
--   SELECT * FROM public_salons_v LIMIT 1;                 -- OK (via view)
-- ============================================================
