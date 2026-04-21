-- =========================================================
-- SoftHair — create_appointment_atomic RPC
-- Migration: 20260422000002_create_appointment_atomic_rpc
-- Author: Dex (Dev Agent) — Story 2.2 Task 2
-- Generated: 2026-04-21
-- Context: Race-safe appointment creation with optional client upsert.
--          Delegates conflict detection to EXCLUDE constraint
--          (migration 20260422000001). Catches SQLSTATE 23P01 and
--          returns a structured error that the Server Action translates.
-- =========================================================

BEGIN;

-- ---------------------------------------------------------
-- RPC: create_appointment_atomic
-- ---------------------------------------------------------
-- Inserts appointment + optionally upserts client (by phone or email within salon).
-- Returns the created appointment on success.
-- Raises an exception with specific SQLSTATE for the caller to catch:
--   - P0001 'conflict': time overlaps another active appointment
--   - P0001 'auth_required': no auth.uid() (shouldn't happen via Server Action)
--   - P0001 'no_salon': user has no default salon
--   - P0001 'service_not_found' / 'professional_not_found' / 'client_not_found'
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

  -- Fetch service (must belong to salon)
  SELECT id, duration_minutes, price_brl
    INTO v_service
    FROM public.services
   WHERE id = p_service_id AND salon_id = v_salon_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = 'service_not_found', ERRCODE = 'P0001';
  END IF;

  v_ends_at := p_scheduled_at + (v_service.duration_minutes || ' minutes')::INTERVAL;

  -- Verify professional belongs to same salon
  IF NOT EXISTS (
    SELECT 1 FROM public.professionals
     WHERE id = p_professional_id AND salon_id = v_salon_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION USING MESSAGE = 'professional_not_found', ERRCODE = 'P0001';
  END IF;

  -- Client: use existing id OR upsert by phone_e164 within salon
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
    -- Upsert by (salon_id, phone_e164)
    INSERT INTO public.clients (salon_id, name, phone_e164, email)
    VALUES (v_salon_id, p_client_name, p_client_phone, p_client_email)
    ON CONFLICT (salon_id, phone_e164) DO UPDATE
      SET name = EXCLUDED.name,
          email = COALESCE(EXCLUDED.email, public.clients.email),
          updated_at = NOW()
    RETURNING id INTO v_client_id;
  END IF;

  -- Cancel token (short random; full JWT version comes in Story 2.7)
  v_cancel_token := encode(gen_random_bytes(16), 'hex');

  -- Insert appointment. EXCLUDE constraint handles race; we let
  -- SQLSTATE 23P01 bubble up so Server Action translates it.
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

COMMENT ON FUNCTION public.create_appointment_atomic IS
  'Atomic appointment creation with race-safe conflict detection via EXCLUDE constraint.
   Upserts client by (salon_id, phone_e164) when client_id is null.
   Raises P0001 with descriptive message on domain errors; SQLSTATE 23P01 on time conflict.';

COMMIT;
