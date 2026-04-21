-- =========================================================
-- SoftHair — create_salon_bootstrap RPC
-- Migration: 20260421000002_create_salon_bootstrap_rpc
-- Author: Dex (Dev Agent) — Story 1.4 Task 5.4
-- Generated: 2026-04-21
-- Context: Supabase JS SDK doesn't expose explicit transactions.
--          Onboarding needs atomic 3-step insert:
--            1. salons (with owner_user_id = auth.uid())
--            2. salon_members (role=OWNER, user_id=auth.uid())
--            3. users.default_salon_id update
--          SECURITY DEFINER RPC handles all three atomically.
-- =========================================================

BEGIN;

-- ---------------------------------------------------------
-- Helper: unaccent_portuguese (pt-BR diacritics removal)
-- ---------------------------------------------------------
-- Simple non-accent fallback (no unaccent extension dependency).
-- Maps common PT-BR accents + & → e. Keeps it light and deterministic.
CREATE OR REPLACE FUNCTION public.unaccent_portuguese(input TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT translate(
    regexp_replace(input, '&', 'e', 'g'),
    'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
    'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'
  );
$$;

-- ---------------------------------------------------------
-- Helper: slugify (pg-native, deterministic)
-- ---------------------------------------------------------
-- Converts "Salão da Maria & Cia" → "salao-da-maria-e-cia"
CREATE OR REPLACE FUNCTION public.slugify(input TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT trim(
    BOTH '-' FROM
    regexp_replace(
      regexp_replace(
        lower(public.unaccent_portuguese(input)),
        '[^a-z0-9]+', '-', 'g'
      ),
      '-+', '-', 'g'
    )
  );
$$;

-- ---------------------------------------------------------
-- RPC: create_salon_bootstrap
-- ---------------------------------------------------------
-- Atomic onboarding flow: creates salon + OWNER membership + user default.
-- Runs as SECURITY DEFINER so RLS policies are bypassed internally, but
-- enforces ownership via auth.uid() checks.
--
-- Returns: full salon row (JSON).
--
-- Errors:
--   - auth_required (no session)
--   - slug_conflict (suggests fallback suffix)
--   - salon_limit_exceeded (user already owns a salon — future constraint)
CREATE OR REPLACE FUNCTION public.create_salon_bootstrap(
  p_name TEXT,
  p_city TEXT DEFAULT NULL,
  p_cnpj TEXT DEFAULT NULL
)
RETURNS public.salons
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_slug TEXT;
  v_base_slug TEXT;
  v_salon public.salons;
  v_suffix INT := 0;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'auth_required'
      USING ERRCODE = 'insufficient_privilege',
            HINT = 'User must be authenticated to create a salon.';
  END IF;

  IF p_name IS NULL OR length(trim(p_name)) < 1 THEN
    RAISE EXCEPTION 'invalid_name'
      USING ERRCODE = 'check_violation',
            HINT = 'Salon name cannot be empty.';
  END IF;

  -- Generate unique slug (suffix with -2, -3, ... if conflict)
  v_base_slug := public.slugify(p_name);
  IF v_base_slug = '' OR v_base_slug IS NULL THEN
    v_base_slug := 'salao';
  END IF;

  v_slug := v_base_slug;
  WHILE EXISTS (SELECT 1 FROM public.salons WHERE slug = v_slug) LOOP
    v_suffix := v_suffix + 1;
    v_slug := v_base_slug || '-' || v_suffix;
    IF v_suffix > 50 THEN
      RAISE EXCEPTION 'slug_conflict'
        USING HINT = 'Too many salons with similar names. Try a more specific name.';
    END IF;
  END LOOP;

  -- Step 1: Insert salon
  INSERT INTO public.salons (name, slug, city, cnpj, owner_user_id)
  VALUES (trim(p_name), v_slug, p_city, p_cnpj, v_user_id)
  RETURNING * INTO v_salon;

  -- Step 2: Insert OWNER membership (HIGH-1 bootstrap fix in RLS lets this pass)
  INSERT INTO public.salon_members (salon_id, user_id, role)
  VALUES (v_salon.id, v_user_id, 'OWNER');

  -- Step 3: Update user default_salon_id
  UPDATE public.users
     SET default_salon_id = v_salon.id
   WHERE id = v_user_id;

  RETURN v_salon;
END;
$$;

COMMENT ON FUNCTION public.create_salon_bootstrap IS
  'Atomic onboarding: creates salons + salon_members OWNER + users.default_salon_id.
   SECURITY DEFINER so internal inserts bypass RLS (safe — function validates auth.uid()).
   Called from Server Action during Story 1.4 Step 1 submit.';

-- Grant execute to authenticated users (not anon)
GRANT EXECUTE ON FUNCTION public.create_salon_bootstrap(TEXT, TEXT, TEXT) TO authenticated;

COMMIT;
