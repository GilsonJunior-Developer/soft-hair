-- =========================================================
-- SoftHair — HOTFIX: create_appointment_atomic RPC
-- Migration: 20260422000005_fix_create_appointment_atomic_rpc
-- Author: Dex (Dev Agent) — Sprint 2.A hotfix
-- Generated: 2026-04-21
-- Context: Previous version (migration ..._00003) used
--          `gen_random_bytes(16)` from pgcrypto, which in Supabase lives
--          under the `extensions` schema and is not reachable from a
--          SECURITY DEFINER function with search_path=public.
-- Fix: use `gen_random_uuid()` (Postgres built-in) and strip dashes for
--      a 32-char hex token — same entropy (128 bits), zero extension dep.
-- Idempotent: CREATE OR REPLACE.
-- =========================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.create_appointment_atomic(
  p_professional_id UUID,
  p_service_id UUID,
  p_scheduled_at TIMESTAMPTZ,
  p_client_id UUID DEFAULT NULL,
  p_client_name TEXT DEFAULT NULL,
  p_client_phone TEXT DEFAULT NULL,
  p_client_email TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_source TEXT DEFAULT 'MANUAL_BY_STAFF'
)
RETURNS public.appointments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_salon_id UUID;
  v_service RECORD;
  v_client_id UUID;
  v_appointment public.appointments;
  v_ends_at TIMESTAMPTZ;
  v_cancel_token TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING MESSAGE = 'auth_required', ERRCODE = 'P0001';
  END IF;

  SELECT default_salon_id INTO v_salon_id
    FROM public.users WHERE id = v_user_id;
  IF v_salon_id IS NULL THEN
    RAISE EXCEPTION USING MESSAGE = 'no_salon', ERRCODE = 'P0001';
  END IF;

  SELECT id, duration_minutes, price_brl
    INTO v_service
    FROM public.services
   WHERE id = p_service_id AND salon_id = v_salon_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = 'service_not_found', ERRCODE = 'P0001';
  END IF;

  v_ends_at := p_scheduled_at + (v_service.duration_minutes || ' minutes')::INTERVAL;

  IF NOT EXISTS (
    SELECT 1 FROM public.professionals
     WHERE id = p_professional_id AND salon_id = v_salon_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION USING MESSAGE = 'professional_not_found', ERRCODE = 'P0001';
  END IF;

  IF p_client_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.clients
       WHERE id = p_client_id AND salon_id = v_salon_id AND deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION USING MESSAGE = 'client_not_found', ERRCODE = 'P0001';
    END IF;
    v_client_id := p_client_id;
  ELSE
    IF p_client_name IS NULL OR p_client_phone IS NULL THEN
      RAISE EXCEPTION USING MESSAGE = 'client_data_required', ERRCODE = 'P0001';
    END IF;
    INSERT INTO public.clients (salon_id, name, phone_e164, email)
    VALUES (v_salon_id, p_client_name, p_client_phone, p_client_email)
    ON CONFLICT (salon_id, phone_e164) DO UPDATE
      SET name = EXCLUDED.name,
          email = COALESCE(EXCLUDED.email, public.clients.email),
          updated_at = NOW()
    RETURNING id INTO v_client_id;
  END IF;

  -- FIX: use built-in gen_random_uuid() instead of extensions.gen_random_bytes()
  v_cancel_token := replace(gen_random_uuid()::text, '-', '');

  INSERT INTO public.appointments (
    salon_id, professional_id, service_id, client_id,
    scheduled_at, duration_minutes, ends_at,
    status, price_brl_original, price_brl_discount, price_brl_final,
    source, cancel_token
  ) VALUES (
    v_salon_id, p_professional_id, p_service_id, v_client_id,
    p_scheduled_at, v_service.duration_minutes, v_ends_at,
    'PENDING_CONFIRMATION', v_service.price_brl, 0, v_service.price_brl,
    p_source::public.appointment_source, v_cancel_token
  )
  RETURNING * INTO v_appointment;

  RETURN v_appointment;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_appointment_atomic(
  UUID, UUID, TIMESTAMPTZ, UUID, TEXT, TEXT, TEXT, TEXT, TEXT
) TO authenticated;

COMMIT;
