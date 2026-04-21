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
