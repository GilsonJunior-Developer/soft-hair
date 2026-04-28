-- =========================================================
-- SoftHair — Story 2.5 (AC4): per-appointment notes
-- Migration: 20260427000000_story_2_5_appointments_notes
-- Author: Dara (Data Engineer)
-- Generated: 2026-04-27
-- Context:
--   AC4 da Story 2.5 exige campo "Observações do atendimento"
--   editável per-appointment (free text registrado pós-serviço pelo
--   staff). RPC create_appointment_atomic já aceitava `p_notes` desde
--   migration 20260422000003 mas nunca persistia o valor — coluna não
--   existia. Esta migration:
--     1. Adiciona public.appointments.notes (TEXT, nullable, sem default)
--     2. Sincroniza create_appointment_atomic para escrever p_notes
--   RLS é row-level — policies existentes cobrem notes automaticamente
--   (sem GRANT/REVOKE adicional). notes não é searchable nesta story,
--   logo sem índice.
-- Idempotente: ADD COLUMN IF NOT EXISTS + CREATE OR REPLACE FUNCTION.
-- Rollback: ALTER TABLE ... DROP COLUMN notes; + restaurar v2 do RPC
--           (migration 20260422000005).
-- =========================================================

BEGIN;

-- ---------------------------------------------------------
-- 1. Coluna `notes` em appointments
-- ---------------------------------------------------------
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN public.appointments.notes IS
  'Observações livres do atendimento, registradas pelo staff pós-serviço. Story 2.5 AC4. Sem CHECK constraint — texto livre limitado pelo TEXT default (1 GB).';

-- ---------------------------------------------------------
-- 2. Sincronizar create_appointment_atomic para escrever p_notes
--    Body idêntico ao 20260422000005 com a única alteração no INSERT
--    (acrescentado `notes` na lista de colunas e `p_notes` em VALUES).
-- ---------------------------------------------------------
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

  v_cancel_token := replace(gen_random_uuid()::text, '-', '');

  INSERT INTO public.appointments (
    salon_id, professional_id, service_id, client_id,
    scheduled_at, duration_minutes, ends_at,
    status, price_brl_original, price_brl_discount, price_brl_final,
    source, cancel_token, notes
  ) VALUES (
    v_salon_id, p_professional_id, p_service_id, v_client_id,
    p_scheduled_at, v_service.duration_minutes, v_ends_at,
    'PENDING_CONFIRMATION', v_service.price_brl, 0, v_service.price_brl,
    p_source::public.appointment_source, v_cancel_token, p_notes
  )
  RETURNING * INTO v_appointment;

  RETURN v_appointment;
END;
$$;

-- Idempotente: GRANT statements de novo. REVOKE FROM PUBLIC + REVOKE FROM anon
-- (Supabase default-ACL grants EXECUTE explicitamente a anon em CREATE FUNCTION
-- mesmo sem GRANT explícito; ver memory feedback_postgres_revoke_from_public.md
-- e auditoria pós-aplicação 2026-04-27 que pegou o gotcha em softhair-dev).
REVOKE EXECUTE ON FUNCTION public.create_appointment_atomic(
  UUID, UUID, TIMESTAMPTZ, UUID, TEXT, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.create_appointment_atomic(
  UUID, UUID, TIMESTAMPTZ, UUID, TEXT, TEXT, TEXT, TEXT, TEXT
) FROM anon;

GRANT EXECUTE ON FUNCTION public.create_appointment_atomic(
  UUID, UUID, TIMESTAMPTZ, UUID, TEXT, TEXT, TEXT, TEXT, TEXT
) TO authenticated;

COMMIT;
