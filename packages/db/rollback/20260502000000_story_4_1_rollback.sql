-- =========================================================
-- SoftHair — Rollback for Story 4.1 commission overrides
-- Mirror of: 20260502000000_story_4_1_professional_service_commissions
-- Author: Dex
-- Generated: 2026-05-02
-- Strategy: drop trigger + table; trigger function dropped (CASCADE)
-- WARNING: rollback destroys all override entries. Run with care.
-- =========================================================

BEGIN;

DROP TRIGGER IF EXISTS trg_psc_updated_at ON public.professional_service_commissions;
DROP FUNCTION IF EXISTS public.tg_professional_service_commissions_updated_at();

-- Indexes are dropped by CASCADE when the table is dropped
DROP TABLE IF EXISTS public.professional_service_commissions CASCADE;

COMMIT;
