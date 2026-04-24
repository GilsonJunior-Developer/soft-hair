-- =========================================================
-- SoftHair — clients.email column
-- Migration: 20260422000002_clients_email_column
-- Author: Dex (Dev Agent) — Sprint 2.A dependency for Stories 2.2 + 2.4
-- Generated: 2026-04-21
-- Context: Public self-booking (2.4) requires email for confirmation
--          + management link delivery (2.7). Add email as nullable
--          CITEXT with format check; RPC create_appointment_atomic
--          upserts name/email based on phone identity.
-- Safe: idempotent (IF NOT EXISTS on column add).
-- =========================================================

BEGIN;

-- ---------------------------------------------------------
-- Add email column (nullable; not yet mandatory)
-- ---------------------------------------------------------
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS email extensions.citext;

-- Format guard (only enforced when non-null)
ALTER TABLE public.clients
  DROP CONSTRAINT IF EXISTS clients_email_format;

ALTER TABLE public.clients
  ADD CONSTRAINT clients_email_format
  CHECK (email IS NULL OR email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$');

COMMENT ON COLUMN public.clients.email IS
  'Optional email for booking confirmations and self-service management (Story 2.7). CITEXT for case-insensitive uniqueness.';

COMMIT;
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
-- =========================================================
-- SoftHair — transition_appointment_status RPC
-- Migration: 20260422000004_transition_appointment_status_rpc
-- Author: Dex (Dev Agent) — Story 2.6 Task 2
-- Generated: 2026-04-21
-- Context: Enforces the appointment state machine and captures an
--          optional cancellation reason. The existing trigger
--          appointments_status_log already inserts an audit row on
--          UPDATE OF status; this RPC updates that row's `reason`
--          after the fact, in the same transaction.
-- =========================================================

BEGIN;

-- ---------------------------------------------------------
-- RPC: transition_appointment_status
-- ---------------------------------------------------------
-- Validates allowed transition, updates status, and (when provided)
-- sets reason on the freshly-inserted audit log row.
--
-- Raises P0001 'invalid_transition' when the requested transition
-- is not allowed by the state machine.
CREATE OR REPLACE FUNCTION public.transition_appointment_status(
  p_appointment_id UUID,
  p_to public.appointment_status,
  p_reason TEXT DEFAULT NULL
)
RETURNS public.appointments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current public.appointment_status;
  v_allowed BOOLEAN := FALSE;
  v_appointment public.appointments;
  v_log_id UUID;
BEGIN
  SELECT status INTO v_current
    FROM public.appointments
   WHERE id = p_appointment_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = 'appointment_not_found', ERRCODE = 'P0001';
  END IF;

  -- State machine:
  --   PENDING_CONFIRMATION → CONFIRMED | CANCELED
  --   CONFIRMED            → COMPLETED | NO_SHOW | CANCELED
  --   terminal: COMPLETED, NO_SHOW, CANCELED
  v_allowed := CASE
    WHEN v_current = 'PENDING_CONFIRMATION' AND p_to IN ('CONFIRMED', 'CANCELED') THEN TRUE
    WHEN v_current = 'CONFIRMED' AND p_to IN ('COMPLETED', 'NO_SHOW', 'CANCELED') THEN TRUE
    ELSE FALSE
  END;

  IF NOT v_allowed THEN
    RAISE EXCEPTION USING
      MESSAGE = 'invalid_transition',
      DETAIL = format('%s → %s', v_current, p_to),
      ERRCODE = 'P0001';
  END IF;

  UPDATE public.appointments
     SET status = p_to,
         updated_at = NOW()
   WHERE id = p_appointment_id
  RETURNING * INTO v_appointment;

  -- The AFTER UPDATE trigger `appointments_status_log` already inserted
  -- the audit row with reason = NULL. Patch it in the same tx if reason given.
  IF p_reason IS NOT NULL THEN
    UPDATE public.appointment_status_log
       SET reason = p_reason
     WHERE id = (
       SELECT id FROM public.appointment_status_log
        WHERE appointment_id = p_appointment_id
          AND to_status = p_to
        ORDER BY created_at DESC
        LIMIT 1
     );
  END IF;

  RETURN v_appointment;
END;
$$;

GRANT EXECUTE ON FUNCTION public.transition_appointment_status(UUID, public.appointment_status, TEXT)
  TO authenticated;

COMMENT ON FUNCTION public.transition_appointment_status IS
  'State-machine-enforced appointment status transition with optional reason capture.
   Valid transitions: PENDING→CONFIRMED|CANCELED, CONFIRMED→COMPLETED|NO_SHOW|CANCELED.
   Terminal states reject further transitions.';

COMMIT;
