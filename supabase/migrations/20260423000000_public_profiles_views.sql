-- ============================================================
-- Story 2.3 Task 2: Public read views for professional pages
--
-- Goal: expose minimal, safe professional + salon + services data
-- to the `anon` role for public booking links like
-- /{salon-slug}/{professional-slug}.
--
-- Strategy: VIEWs (SECURITY INVOKER off by default) owned by
-- postgres role bypass base-table RLS, exposing only the subset
-- of columns safe for public consumption. Base tables remain
-- restricted by RLS for direct queries.
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

-- ----------------------------------------------------------
-- VIEW: public_salons_v
-- ----------------------------------------------------------
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

-- ----------------------------------------------------------
-- VIEW: public_professionals_v
-- ----------------------------------------------------------
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

-- ----------------------------------------------------------
-- VIEW: public_services_v
-- ----------------------------------------------------------
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

-- ----------------------------------------------------------
-- Grants: anon + authenticated may SELECT the public views.
-- Base tables stay restricted by RLS.
-- ----------------------------------------------------------
GRANT SELECT ON public.public_salons_v        TO anon, authenticated;
GRANT SELECT ON public.public_professionals_v TO anon, authenticated;
GRANT SELECT ON public.public_services_v      TO anon, authenticated;

COMMIT;

-- ============================================================
-- Verification (Task 2.3) — run as `anon` after apply:
--   SELECT * FROM public_professionals_v;        -- OK
--   SELECT commission_default_percent
--     FROM professionals;                        -- FAIL: no direct SELECT on base
--   SELECT * FROM public_salons_v
--     WHERE slug = 'some-salon';                 -- OK, returns single row
-- ============================================================
