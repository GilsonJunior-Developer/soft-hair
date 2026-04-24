-- =========================================================
-- SoftHair — Story 2.4: Client-Facing Self-Booking
-- Migration: 20260424000000_story_2_4_public_booking
-- Author: Dex (Dev Agent)
-- Generated: 2026-04-24
--
-- Delivers the DB surface for the public self-booking flow
-- at /(public)/[salon]/[professional]/book:
--
--   1. clients.lgpd_consent_text_hash     (column add)
--   2. compute_public_availability()      (anon-callable)
--   3. create_public_booking_atomic()     (anon-callable)
--   4. get_public_booking()               (anon-callable, token-auth)
--
-- All callable-by-anon RPCs are SECURITY DEFINER and derive
-- salon context from (salon_slug, professional_slug) inputs —
-- we do NOT grant broad anon access to base tables.
--
-- Race-safety is delegated to the existing EXCLUDE constraint
-- appointments_no_professional_overlap (migration ..._00001).
-- =========================================================

BEGIN;

-- ----------------------------------------------------------
-- 1. clients.lgpd_consent_text_hash
--    SHA-256 (hex) of the exact consent copy the client
--    agreed to. lgpd_consent_at (timestamp) was already in
--    the initial schema.
-- ----------------------------------------------------------
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS lgpd_consent_text_hash TEXT;

COMMENT ON COLUMN public.clients.lgpd_consent_text_hash IS
  'Hex hash of the LGPD consent copy shown to the client at booking time. Paired with lgpd_consent_at for audit.';

-- ----------------------------------------------------------
-- 2. compute_public_availability
--    Returns ISO slot starts (15-min granularity) that fit the
--    service duration inside the professional working_hours,
--    excluding any overlap with active appointments.
--
--    NOTE on timezone: MVP assumes working_hours_jsonb is in
--    America/Sao_Paulo. Multi-tz support is Phase 2.
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.compute_public_availability(
  p_salon_slug TEXT,
  p_professional_slug TEXT,
  p_service_id UUID,
  p_from TIMESTAMPTZ,
  p_to TIMESTAMPTZ
)
RETURNS TABLE(slot_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_salon_id UUID;
  v_professional_id UUID;
  v_duration_minutes INT;
  v_working_hours JSONB;
  v_day_cursor DATE;
  v_end_date DATE;
  v_dow INT;
  v_dow_key TEXT;
  v_day_ranges JSONB;
  v_range JSONB;
  v_range_start TIMESTAMPTZ;
  v_range_end TIMESTAMPTZ;
  v_slot TIMESTAMPTZ;
  v_slot_end TIMESTAMPTZ;
  v_booked_ranges TSTZRANGE[];
  v_is_free BOOLEAN;
  v_window_cap CONSTANT INTERVAL := INTERVAL '30 days';
BEGIN
  IF p_to <= p_from THEN
    RETURN;
  END IF;

  IF p_to - p_from > v_window_cap THEN
    p_to := p_from + v_window_cap;
  END IF;
  IF p_from < NOW() THEN
    p_from := NOW();
  END IF;

  SELECT id INTO v_salon_id
    FROM public.salons
   WHERE slug = p_salon_slug
     AND deleted_at IS NULL;
  IF v_salon_id IS NULL THEN
    RETURN;
  END IF;

  SELECT p.id, p.working_hours_jsonb
    INTO v_professional_id, v_working_hours
    FROM public.professionals p
   WHERE p.salon_id = v_salon_id
     AND p.slug = p_professional_slug
     AND p.is_active = TRUE
     AND p.deleted_at IS NULL;
  IF v_professional_id IS NULL THEN
    RETURN;
  END IF;

  SELECT duration_minutes INTO v_duration_minutes
    FROM public.services
   WHERE id = p_service_id
     AND salon_id = v_salon_id
     AND is_active = TRUE
     AND deleted_at IS NULL;
  IF v_duration_minutes IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(array_agg(tstzrange(scheduled_at, ends_at, '[)')), '{}')
    INTO v_booked_ranges
    FROM public.appointments
   WHERE professional_id = v_professional_id
     AND status IN ('PENDING_CONFIRMATION', 'CONFIRMED')
     AND deleted_at IS NULL
     AND tstzrange(scheduled_at, ends_at, '[)') && tstzrange(p_from, p_to, '[)');

  v_day_cursor := (p_from AT TIME ZONE 'America/Sao_Paulo')::date;
  v_end_date   := (p_to   AT TIME ZONE 'America/Sao_Paulo')::date;

  WHILE v_day_cursor <= v_end_date LOOP
    v_dow := EXTRACT(DOW FROM v_day_cursor)::INT;
    v_dow_key := CASE v_dow
      WHEN 0 THEN 'sun'
      WHEN 1 THEN 'mon'
      WHEN 2 THEN 'tue'
      WHEN 3 THEN 'wed'
      WHEN 4 THEN 'thu'
      WHEN 5 THEN 'fri'
      WHEN 6 THEN 'sat'
    END;

    v_day_ranges := COALESCE(v_working_hours -> v_dow_key, '[]'::jsonb);

    FOR v_range IN SELECT * FROM jsonb_array_elements(v_day_ranges)
    LOOP
      v_range_start := ((v_day_cursor::text || ' ' || (v_range->>'from') || ':00')::timestamp
                        AT TIME ZONE 'America/Sao_Paulo');
      v_range_end   := ((v_day_cursor::text || ' ' || (v_range->>'to')   || ':00')::timestamp
                        AT TIME ZONE 'America/Sao_Paulo');

      v_slot := v_range_start;
      WHILE v_slot + (v_duration_minutes || ' minutes')::INTERVAL <= v_range_end LOOP
        v_slot_end := v_slot + (v_duration_minutes || ' minutes')::INTERVAL;

        IF v_slot >= NOW() AND v_slot >= p_from AND v_slot_end <= p_to THEN
          v_is_free := TRUE;
          IF v_booked_ranges IS NOT NULL AND array_length(v_booked_ranges, 1) IS NOT NULL THEN
            FOR i IN 1..array_length(v_booked_ranges, 1) LOOP
              IF v_booked_ranges[i] && tstzrange(v_slot, v_slot_end, '[)') THEN
                v_is_free := FALSE;
                EXIT;
              END IF;
            END LOOP;
          END IF;

          IF v_is_free THEN
            slot_at := v_slot;
            RETURN NEXT;
          END IF;
        END IF;

        v_slot := v_slot + INTERVAL '15 minutes';
      END LOOP;
    END LOOP;

    v_day_cursor := v_day_cursor + 1;
  END LOOP;

  RETURN;
END;
$$;

COMMENT ON FUNCTION public.compute_public_availability(TEXT, TEXT, UUID, TIMESTAMPTZ, TIMESTAMPTZ) IS
  'Public (anon-callable) availability computation for the self-booking page. Returns 15-min slots that fit the service in the pro working hours, excluding overlaps. SECURITY DEFINER — does not expose working_hours_jsonb to anon directly.';

GRANT EXECUTE ON FUNCTION public.compute_public_availability(TEXT, TEXT, UUID, TIMESTAMPTZ, TIMESTAMPTZ)
  TO anon, authenticated;

-- ----------------------------------------------------------
-- 3. create_public_booking_atomic
--    Race-safe INSERT via the existing EXCLUDE constraint.
--    Returns resume fields so the success page can hydrate
--    without a second round-trip.
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_public_booking_atomic(
  p_salon_slug TEXT,
  p_professional_slug TEXT,
  p_service_id UUID,
  p_scheduled_at TIMESTAMPTZ,
  p_client_name TEXT,
  p_client_email TEXT,
  p_client_phone TEXT,
  p_lgpd_consent_text_hash TEXT
)
RETURNS TABLE(
  appointment_id UUID,
  cancel_token TEXT,
  scheduled_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  salon_name TEXT,
  salon_slug TEXT,
  professional_name TEXT,
  service_name TEXT,
  price_brl NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_salon_id UUID;
  v_salon_name TEXT;
  v_professional_id UUID;
  v_professional_name TEXT;
  v_duration_minutes INT;
  v_price_brl NUMERIC;
  v_service_name TEXT;
  v_client_id UUID;
  v_ends_at TIMESTAMPTZ;
  v_cancel_token TEXT;
  v_appointment_id UUID;
BEGIN
  IF p_client_name IS NULL OR length(trim(p_client_name)) < 2 THEN
    RAISE EXCEPTION USING MESSAGE = 'invalid_name', ERRCODE = 'P0001';
  END IF;
  IF p_client_email IS NULL OR p_client_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' THEN
    RAISE EXCEPTION USING MESSAGE = 'invalid_email', ERRCODE = 'P0001';
  END IF;
  IF p_client_phone IS NULL OR p_client_phone !~ '^\+[1-9][0-9]{10,14}$' THEN
    RAISE EXCEPTION USING MESSAGE = 'invalid_phone', ERRCODE = 'P0001';
  END IF;
  IF p_lgpd_consent_text_hash IS NULL OR length(p_lgpd_consent_text_hash) < 32 THEN
    RAISE EXCEPTION USING MESSAGE = 'consent_required', ERRCODE = 'P0001';
  END IF;
  IF p_scheduled_at <= NOW() THEN
    RAISE EXCEPTION USING MESSAGE = 'scheduled_in_past', ERRCODE = 'P0001';
  END IF;

  SELECT s.id, s.name INTO v_salon_id, v_salon_name
    FROM public.salons s
   WHERE s.slug = p_salon_slug
     AND s.deleted_at IS NULL;
  IF v_salon_id IS NULL THEN
    RAISE EXCEPTION USING MESSAGE = 'salon_not_found', ERRCODE = 'P0001';
  END IF;

  SELECT p.id, p.name INTO v_professional_id, v_professional_name
    FROM public.professionals p
   WHERE p.salon_id = v_salon_id
     AND p.slug = p_professional_slug
     AND p.is_active = TRUE
     AND p.deleted_at IS NULL;
  IF v_professional_id IS NULL THEN
    RAISE EXCEPTION USING MESSAGE = 'professional_not_found', ERRCODE = 'P0001';
  END IF;

  SELECT sv.duration_minutes, sv.price_brl, sv.name
    INTO v_duration_minutes, v_price_brl, v_service_name
    FROM public.services sv
   WHERE sv.id = p_service_id
     AND sv.salon_id = v_salon_id
     AND sv.is_active = TRUE
     AND sv.deleted_at IS NULL;
  IF v_duration_minutes IS NULL THEN
    RAISE EXCEPTION USING MESSAGE = 'service_not_found', ERRCODE = 'P0001';
  END IF;

  v_ends_at := p_scheduled_at + (v_duration_minutes || ' minutes')::INTERVAL;

  INSERT INTO public.clients (
    salon_id, name, phone_e164, email,
    lgpd_consent_at, lgpd_consent_text_hash
  ) VALUES (
    v_salon_id, trim(p_client_name), p_client_phone, p_client_email,
    NOW(), p_lgpd_consent_text_hash
  )
  ON CONFLICT (salon_id, phone_e164) DO UPDATE
    SET name = EXCLUDED.name,
        email = COALESCE(EXCLUDED.email, public.clients.email),
        lgpd_consent_at = EXCLUDED.lgpd_consent_at,
        lgpd_consent_text_hash = EXCLUDED.lgpd_consent_text_hash,
        updated_at = NOW()
  RETURNING id INTO v_client_id;

  v_cancel_token := replace(gen_random_uuid()::text, '-', '');

  INSERT INTO public.appointments (
    salon_id, professional_id, service_id, client_id,
    scheduled_at, duration_minutes, ends_at,
    status, price_brl_original, price_brl_discount, price_brl_final,
    source, cancel_token
  ) VALUES (
    v_salon_id, v_professional_id, p_service_id, v_client_id,
    p_scheduled_at, v_duration_minutes, v_ends_at,
    'PENDING_CONFIRMATION', v_price_brl, 0, v_price_brl,
    'PUBLIC_LINK'::public.appointment_source, v_cancel_token
  )
  RETURNING id INTO v_appointment_id;

  RETURN QUERY SELECT
    v_appointment_id      AS appointment_id,
    v_cancel_token        AS cancel_token,
    p_scheduled_at        AS scheduled_at,
    v_ends_at             AS ends_at,
    v_salon_name          AS salon_name,
    p_salon_slug          AS salon_slug,
    v_professional_name   AS professional_name,
    v_service_name        AS service_name,
    v_price_brl           AS price_brl;
END;
$$;

COMMENT ON FUNCTION public.create_public_booking_atomic(
  TEXT, TEXT, UUID, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT
) IS
  'Public self-booking creation (Story 2.4). Upserts client by (salon_id, phone), inserts appointment as PENDING_CONFIRMATION / PUBLIC_LINK, returns summary fields. Race-safety via EXCLUDE constraint appointments_no_professional_overlap (raises 23P01 on conflict).';

GRANT EXECUTE ON FUNCTION public.create_public_booking_atomic(
  TEXT, TEXT, UUID, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT
) TO anon, authenticated;

-- ----------------------------------------------------------
-- 4. get_public_booking
--    Fetches a booking summary for the success page. Auth =
--    matching cancel_token. No PII of other clients exposed.
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_booking(
  p_appointment_id UUID,
  p_cancel_token TEXT
)
RETURNS TABLE(
  appointment_id UUID,
  scheduled_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  status TEXT,
  client_name TEXT,
  client_email TEXT,
  salon_name TEXT,
  salon_slug TEXT,
  professional_name TEXT,
  professional_slug TEXT,
  service_name TEXT,
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
    a.status::TEXT,
    c.name,
    c.email::TEXT,
    s.name,
    s.slug,
    pr.name,
    pr.slug,
    sv.name,
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

COMMENT ON FUNCTION public.get_public_booking(UUID, TEXT) IS
  'Token-authenticated single-appointment read for the Story 2.4 success page. Returns NULL rows if token mismatches.';

GRANT EXECUTE ON FUNCTION public.get_public_booking(UUID, TEXT) TO anon, authenticated;

COMMIT;
