-- =========================================================
-- SoftHair — Story 2.7: Client-Side Appointment Management
-- Migration: 20260425000000_story_2_7_appointment_management
-- Author: Dex (Dev Agent)
-- Generated: 2026-04-24
--
-- Delivers the DB surface for the client self-manage flow at
-- /(public)/agendamento/[token]:
--
--   1. get_public_appointment()       (anon-callable, token-gated)
--   2. cancel_public_appointment()    (anon-callable, token-gated)
--   3. reschedule_public_appointment()(anon-callable, token-gated)
--   4. REVOKE get_public_booking FROM anon   (closes 2.4-SEC-001)
--
-- All anon-callable RPCs are SECURITY DEFINER and verify the
-- (appointment_id, cancel_token) pair from the DB row. The caller
-- (Server Action) additionally verifies the JWT signature before
-- invoking the RPC, giving defense-in-depth:
--   - Tampered JWT           → rejected by TS layer (bad signature)
--   - Guessed appointment_id → rejected by DB layer (wrong cancel_token)
-- =========================================================

BEGIN;

-- ----------------------------------------------------------
-- 1. get_public_appointment
--    Returns the manage-page payload. Caller passes the
--    (appointment_id, cancel_token) pair extracted from the
--    JWT claims; the RPC verifies both fields match the DB row.
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_appointment(
  p_appointment_id UUID,
  p_cancel_token TEXT
)
RETURNS TABLE(
  appointment_id UUID,
  scheduled_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  duration_minutes INT,
  status TEXT,
  client_name TEXT,
  client_email TEXT,
  salon_name TEXT,
  salon_slug TEXT,
  salon_city TEXT,
  cancel_window_hours INT,
  professional_name TEXT,
  professional_slug TEXT,
  service_id UUID,
  service_name TEXT,
  service_duration_minutes INT,
  price_brl NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    a.id,
    a.scheduled_at,
    a.ends_at,
    a.duration_minutes,
    a.status::TEXT,
    c.name,
    c.email::TEXT,
    s.name,
    s.slug,
    s.city,
    COALESCE((s.settings_jsonb->>'cancel_window_hours')::INT, 24),
    pr.name,
    pr.slug,
    sv.id,
    sv.name,
    sv.duration_minutes,
    a.price_brl_final
  FROM public.appointments a
  JOIN public.salons s         ON s.id  = a.salon_id
  JOIN public.professionals pr ON pr.id = a.professional_id
  JOIN public.services sv      ON sv.id = a.service_id
  JOIN public.clients c        ON c.id  = a.client_id
  WHERE a.id = p_appointment_id
    AND a.cancel_token = p_cancel_token
    AND a.deleted_at IS NULL;
$$;

COMMENT ON FUNCTION public.get_public_appointment(UUID, TEXT) IS
  'Story 2.7: token-gated single-appointment read for the manage page. Pair (id, cancel_token) must match. Returns empty set if no match. Exposes cancel_window_hours from salons.settings_jsonb so the UI can gate the Cancel button without a second round-trip.';

GRANT EXECUTE ON FUNCTION public.get_public_appointment(UUID, TEXT)
  TO anon, authenticated;

-- ----------------------------------------------------------
-- 2. cancel_public_appointment
--    Client-initiated cancellation respecting the salon-level
--    cancel window from settings_jsonb.cancel_window_hours.
--    Row-level lock (FOR UPDATE) prevents cancel races against
--    concurrent reschedules.
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_public_appointment(
  p_appointment_id UUID,
  p_cancel_token TEXT,
  p_reason TEXT DEFAULT 'cancelled_by_client'
)
RETURNS TABLE(
  appointment_id UUID,
  status TEXT,
  canceled_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current public.appointment_status;
  v_scheduled_at TIMESTAMPTZ;
  v_salon_id UUID;
  v_window_hours INT;
  v_deadline TIMESTAMPTZ;
  v_updated TIMESTAMPTZ;
BEGIN
  SELECT status, scheduled_at, salon_id
    INTO v_current, v_scheduled_at, v_salon_id
    FROM public.appointments
   WHERE id = p_appointment_id
     AND cancel_token = p_cancel_token
     AND deleted_at IS NULL
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      MESSAGE = 'not_found_or_token_mismatch',
      ERRCODE = 'P0001';
  END IF;

  IF v_current IN ('COMPLETED', 'NO_SHOW', 'CANCELED') THEN
    RAISE EXCEPTION USING
      MESSAGE = 'already_terminal',
      DETAIL = v_current::TEXT,
      ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE((settings_jsonb->>'cancel_window_hours')::INT, 24)
    INTO v_window_hours
    FROM public.salons
   WHERE id = v_salon_id;

  v_deadline := v_scheduled_at - (v_window_hours || ' hours')::INTERVAL;

  IF NOW() > v_deadline THEN
    RAISE EXCEPTION USING
      MESSAGE = 'window_closed',
      DETAIL = v_window_hours::TEXT,
      ERRCODE = 'P0001';
  END IF;

  UPDATE public.appointments
     SET status = 'CANCELED',
         updated_at = NOW()
   WHERE id = p_appointment_id
  RETURNING updated_at INTO v_updated;

  -- Patch audit-log reason (appointments_status_log trigger already
  -- inserted the row with reason = NULL on the UPDATE above).
  IF p_reason IS NOT NULL THEN
    UPDATE public.appointment_status_log
       SET reason = p_reason
     WHERE id = (
       SELECT id FROM public.appointment_status_log
        WHERE appointment_id = p_appointment_id
          AND to_status = 'CANCELED'
        ORDER BY created_at DESC
        LIMIT 1
     );
  END IF;

  RETURN QUERY SELECT p_appointment_id, 'CANCELED'::TEXT, v_updated;
END;
$$;

COMMENT ON FUNCTION public.cancel_public_appointment(UUID, TEXT, TEXT) IS
  'Story 2.7: token-gated client cancel respecting salons.settings_jsonb.cancel_window_hours (default 24h). Raises P0001 with MESSAGE in { not_found_or_token_mismatch, already_terminal, window_closed } for caller to translate.';

GRANT EXECUTE ON FUNCTION public.cancel_public_appointment(UUID, TEXT, TEXT)
  TO anon, authenticated;

-- ----------------------------------------------------------
-- 3. reschedule_public_appointment
--    Atomic "cancel old + create new" carrying over
--    professional/service/client. New appointment gets a fresh
--    cancel_token. Race-safety on the new INSERT is inherited
--    from the EXCLUDE constraint established in Story 2.2.
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reschedule_public_appointment(
  p_old_appointment_id UUID,
  p_old_cancel_token TEXT,
  p_new_scheduled_at TIMESTAMPTZ
)
RETURNS TABLE(
  appointment_id UUID,
  cancel_token TEXT,
  scheduled_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  salon_name TEXT,
  salon_slug TEXT,
  professional_name TEXT,
  professional_slug TEXT,
  service_name TEXT,
  price_brl NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_status public.appointment_status;
  v_old_scheduled_at TIMESTAMPTZ;
  v_salon_id UUID;
  v_professional_id UUID;
  v_service_id UUID;
  v_client_id UUID;
  v_duration_minutes INT;
  v_price_brl NUMERIC;
  v_window_hours INT;
  v_deadline TIMESTAMPTZ;
  v_new_ends_at TIMESTAMPTZ;
  v_new_cancel_token TEXT;
  v_new_appointment_id UUID;
  v_salon_name TEXT;
  v_salon_slug TEXT;
  v_professional_name TEXT;
  v_professional_slug TEXT;
  v_service_name TEXT;
BEGIN
  SELECT a.status, a.scheduled_at, a.salon_id, a.professional_id, a.service_id,
         a.client_id, a.duration_minutes, a.price_brl_original
    INTO v_old_status, v_old_scheduled_at, v_salon_id, v_professional_id, v_service_id,
         v_client_id, v_duration_minutes, v_price_brl
    FROM public.appointments a
   WHERE a.id = p_old_appointment_id
     AND a.cancel_token = p_old_cancel_token
     AND a.deleted_at IS NULL
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      MESSAGE = 'not_found_or_token_mismatch',
      ERRCODE = 'P0001';
  END IF;

  IF v_old_status IN ('COMPLETED', 'NO_SHOW', 'CANCELED') THEN
    RAISE EXCEPTION USING
      MESSAGE = 'already_terminal',
      DETAIL = v_old_status::TEXT,
      ERRCODE = 'P0001';
  END IF;

  IF p_new_scheduled_at <= NOW() THEN
    RAISE EXCEPTION USING
      MESSAGE = 'scheduled_in_past',
      ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE((settings_jsonb->>'cancel_window_hours')::INT, 24)
    INTO v_window_hours
    FROM public.salons
   WHERE id = v_salon_id;

  v_deadline := v_old_scheduled_at - (v_window_hours || ' hours')::INTERVAL;
  IF NOW() > v_deadline THEN
    RAISE EXCEPTION USING
      MESSAGE = 'window_closed',
      DETAIL = v_window_hours::TEXT,
      ERRCODE = 'P0001';
  END IF;

  -- Cancel old
  UPDATE public.appointments
     SET status = 'CANCELED',
         updated_at = NOW()
   WHERE id = p_old_appointment_id;

  UPDATE public.appointment_status_log
     SET reason = 'rescheduled_by_client'
   WHERE id = (
     SELECT id FROM public.appointment_status_log
      WHERE appointment_id = p_old_appointment_id
        AND to_status = 'CANCELED'
      ORDER BY created_at DESC
      LIMIT 1
   );

  -- Create new
  v_new_ends_at := p_new_scheduled_at + (v_duration_minutes || ' minutes')::INTERVAL;
  v_new_cancel_token := replace(gen_random_uuid()::text, '-', '');

  INSERT INTO public.appointments (
    salon_id, professional_id, service_id, client_id,
    scheduled_at, duration_minutes, ends_at,
    status, price_brl_original, price_brl_discount, price_brl_final,
    source, cancel_token
  ) VALUES (
    v_salon_id, v_professional_id, v_service_id, v_client_id,
    p_new_scheduled_at, v_duration_minutes, v_new_ends_at,
    'PENDING_CONFIRMATION', v_price_brl, 0, v_price_brl,
    'PUBLIC_LINK'::public.appointment_source, v_new_cancel_token
  )
  RETURNING id INTO v_new_appointment_id;

  -- Fetch display fields for the response (Server Action uses these to sign a fresh JWT)
  SELECT s.name, s.slug INTO v_salon_name, v_salon_slug
    FROM public.salons s WHERE s.id = v_salon_id;
  SELECT p.name, p.slug INTO v_professional_name, v_professional_slug
    FROM public.professionals p WHERE p.id = v_professional_id;
  SELECT sv.name INTO v_service_name
    FROM public.services sv WHERE sv.id = v_service_id;

  RETURN QUERY SELECT
    v_new_appointment_id,
    v_new_cancel_token,
    p_new_scheduled_at,
    v_new_ends_at,
    v_salon_name,
    v_salon_slug,
    v_professional_name,
    v_professional_slug,
    v_service_name,
    v_price_brl;
END;
$$;

COMMENT ON FUNCTION public.reschedule_public_appointment(UUID, TEXT, TIMESTAMPTZ) IS
  'Story 2.7: atomic reschedule. Cancels old + creates new carrying over (professional, service, client, duration, price). New appointment gets fresh cancel_token. Race-safety via EXCLUDE constraint appointments_no_professional_overlap (23P01).';

GRANT EXECUTE ON FUNCTION public.reschedule_public_appointment(UUID, TEXT, TIMESTAMPTZ)
  TO anon, authenticated;

-- ----------------------------------------------------------
-- 4. Close 2.4-SEC-001: revoke anon access to get_public_booking
--    The Story 2.4 success page (`/book/success/[id]?t=<cancel_token>`)
--    is being retired in this story's web layer. Revoking anon EXECUTE
--    here ensures that any cached/bookmarked URL from the brief window
--    when 2.4 was live cannot be used to read client PII anymore.
--    `authenticated` keeps access (internal tooling may still call it).
--
--    GOTCHA: PostgreSQL grants `EXECUTE TO PUBLIC` on every function
--    by default at CREATE time. The original migration's
--    `GRANT EXECUTE ... TO anon` was redundant — anon already had it
--    via PUBLIC. Just `REVOKE FROM anon` is therefore a no-op (the
--    inherited grant from PUBLIC remains). Must REVOKE FROM PUBLIC to
--    actually deny anon. Caught during dev apply on 2026-04-25 by Dara
--    via has_function_privilege() check.
-- ----------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.get_public_booking(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_public_booking(UUID, TEXT) FROM anon;
-- Re-grant to authenticated explicitly (PUBLIC revoke removed the
-- inherited path; authenticated had its own explicit grant from the
-- 2.4 migration but adding here makes intent crystal clear).
GRANT  EXECUTE ON FUNCTION public.get_public_booking(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION public.get_public_booking(UUID, TEXT) IS
  'DEPRECATED by Story 2.7 (2026-04-24). Use public.get_public_appointment instead. Anon access revoked to close 2.4-SEC-001 (token-in-URL PII leak risk). Still reachable from authenticated context.';

COMMIT;
