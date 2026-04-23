-- ============================================================
-- Story 2.3 Task 2: Public read views for professional pages
--
-- Creates 3 VIEWs over salons/professionals/services that expose
-- only the column subset safe for anonymous public consumption
-- (e.g. the /{salon-slug}/{professional-slug} page).
--
-- NOTE: This migration establishes the views. The follow-up
-- migration 20260423000001 configures the final security model
-- (security_invoker=TRUE + column GRANTs + RLS policies), so
-- reading this file in isolation is misleading — always read the
-- pair 20260423000000..000003 together.
--
-- Public columns by table:
--   salons        -> id, name, slug, city
--   professionals -> id, salon_id, slug, name, photo_url, bio, specialties
--   services      -> id, salon_id, name, category, duration_minutes, price_brl
--
-- Excluded (sensitive, never public):
--   salons.owner_user_id / subscription_* / trial_* / settings_jsonb / cnpj
--   professionals.user_id / commission_* / working_hours_jsonb
--   services.catalog_id / commission_override_percent
-- ============================================================

BEGIN;

CREATE OR REPLACE VIEW public.public_salons_v AS
SELECT
  id,
  name,
  slug,
  city
FROM public.salons
WHERE deleted_at IS NULL;

COMMENT ON VIEW public.public_salons_v IS
  'Story 2.3: Public (anon) read view of active salons. Minimum columns for /{salon}/{professional} rendering.';

CREATE OR REPLACE VIEW public.public_professionals_v AS
SELECT
  id,
  salon_id,
  slug,
  name,
  photo_url,
  bio,
  specialties
FROM public.professionals
WHERE is_active = TRUE AND deleted_at IS NULL;

COMMENT ON VIEW public.public_professionals_v IS
  'Story 2.3: Public (anon) read view of active professionals. Never exposes commission, working hours or user_id.';

CREATE OR REPLACE VIEW public.public_services_v AS
SELECT
  id,
  salon_id,
  name,
  category,
  duration_minutes,
  price_brl
FROM public.services
WHERE is_active = TRUE AND deleted_at IS NULL;

COMMENT ON VIEW public.public_services_v IS
  'Story 2.3: Public (anon) read view of active services. Excludes commission_override_percent and catalog_id.';

-- Initial GRANTs to anon/authenticated.
-- Migration 20260423000001 overrides these with the hardened model
-- (security_invoker + column-level grants on base tables + RLS policies).
GRANT SELECT ON public.public_salons_v        TO anon, authenticated;
GRANT SELECT ON public.public_professionals_v TO anon, authenticated;
GRANT SELECT ON public.public_services_v      TO anon, authenticated;

COMMIT;
