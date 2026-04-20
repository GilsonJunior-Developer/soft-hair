-- =========================================================
-- SoftHair — Functions & Triggers
-- Migration: 20260420000003_functions_and_triggers
-- Author: Dara (Data Engineer Agent)
-- Generated: 2026-04-20
-- =========================================================

BEGIN;

-- ---------------------------------------------------------
-- Trigger: appointment_status_log (auditoria automática)
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_appointment_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só loga se status mudou
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.appointment_status_log
      (salon_id, appointment_id, from_status, to_status, changed_by)
    VALUES
      (NEW.salon_id,
       NEW.id,
       CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.status END,
       NEW.status,
       auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER appointments_status_log
  AFTER INSERT OR UPDATE OF status ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.log_appointment_status_change();

COMMENT ON FUNCTION public.log_appointment_status_change() IS
  'Audita mudanças de status. SECURITY DEFINER para bypassar RLS em status_log.';

-- ---------------------------------------------------------
-- Trigger: credit_balance sync via client_credits_log
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_client_credit_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance NUMERIC(10,2);
  v_new_balance NUMERIC(10,2);
BEGIN
  -- Lock da row do cliente para evitar race condition
  SELECT credit_balance_brl INTO v_current_balance
    FROM public.clients
    WHERE id = NEW.client_id
    FOR UPDATE;

  v_new_balance := v_current_balance + NEW.amount_brl;

  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'Saldo insuficiente: tentativa de usar R$ % com saldo R$ %',
      ABS(NEW.amount_brl), v_current_balance
      USING ERRCODE = 'check_violation';
  END IF;

  -- Persiste balance_after no próprio log (auditoria)
  NEW.balance_after_brl := v_new_balance;

  -- Atualiza cliente
  UPDATE public.clients
    SET credit_balance_brl = v_new_balance,
        updated_at = NOW()
    WHERE id = NEW.client_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER credits_log_sync_balance
  BEFORE INSERT ON public.client_credits_log
  FOR EACH ROW EXECUTE FUNCTION public.sync_client_credit_balance();

COMMENT ON FUNCTION public.sync_client_credit_balance() IS
  'Mantém clients.credit_balance_brl consistente com ledger. Usa FOR UPDATE para evitar race.';

-- ---------------------------------------------------------
-- Trigger: valida que ledger é imutável (append-only)
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_credits_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'client_credits_log é append-only. Use INSERT, nunca UPDATE/DELETE.'
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE TRIGGER credits_log_immutable_update
  BEFORE UPDATE ON public.client_credits_log
  FOR EACH ROW EXECUTE FUNCTION public.prevent_credits_log_mutation();

CREATE TRIGGER credits_log_immutable_delete
  BEFORE DELETE ON public.client_credits_log
  FOR EACH ROW EXECUTE FUNCTION public.prevent_credits_log_mutation();

-- Mesma regra para appointment_status_log
CREATE TRIGGER status_log_immutable_update
  BEFORE UPDATE ON public.appointment_status_log
  FOR EACH ROW EXECUTE FUNCTION public.prevent_credits_log_mutation();

CREATE TRIGGER status_log_immutable_delete
  BEFORE DELETE ON public.appointment_status_log
  FOR EACH ROW EXECUTE FUNCTION public.prevent_credits_log_mutation();

-- ---------------------------------------------------------
-- HIGH-2 fix: Cross-salon FK consistency validation
-- Garante que appointment.{professional,service,client}.salon_id
-- todos apontam para o mesmo salon_id do appointment.
-- Defense-in-depth além de RLS.
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_appointment_salon_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prof_salon UUID;
  v_svc_salon UUID;
  v_cli_salon UUID;
BEGIN
  SELECT salon_id INTO v_prof_salon FROM public.professionals WHERE id = NEW.professional_id;
  SELECT salon_id INTO v_svc_salon  FROM public.services      WHERE id = NEW.service_id;
  SELECT salon_id INTO v_cli_salon  FROM public.clients       WHERE id = NEW.client_id;

  IF v_prof_salon IS DISTINCT FROM NEW.salon_id THEN
    RAISE EXCEPTION 'professional_id (%) não pertence ao salon_id (%)',
      NEW.professional_id, NEW.salon_id
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_svc_salon IS DISTINCT FROM NEW.salon_id THEN
    RAISE EXCEPTION 'service_id (%) não pertence ao salon_id (%)',
      NEW.service_id, NEW.salon_id
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_cli_salon IS DISTINCT FROM NEW.salon_id THEN
    RAISE EXCEPTION 'client_id (%) não pertence ao salon_id (%)',
      NEW.client_id, NEW.salon_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER appointments_validate_salon_consistency
  BEFORE INSERT OR UPDATE OF salon_id, professional_id, service_id, client_id
  ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.validate_appointment_salon_consistency();

COMMENT ON FUNCTION public.validate_appointment_salon_consistency() IS
  'Valida que professional, service e client pertencem ao mesmo salão do appointment. Defense-in-depth além de RLS.';

-- ---------------------------------------------------------
-- HIGH-2 fix (extended): Cross-salon consistency em referrals
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_referral_salon_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_salon UUID;
  v_referred_salon UUID;
  v_token_salon UUID;
  v_appt_salon UUID;
BEGIN
  SELECT salon_id INTO v_referrer_salon FROM public.clients        WHERE id = NEW.referrer_client_id;
  SELECT salon_id INTO v_referred_salon FROM public.clients        WHERE id = NEW.referred_client_id;
  SELECT salon_id INTO v_token_salon    FROM public.referral_tokens WHERE id = NEW.referral_token_id;
  SELECT salon_id INTO v_appt_salon     FROM public.appointments    WHERE id = NEW.first_appointment_id;

  IF v_referrer_salon IS DISTINCT FROM NEW.salon_id OR
     v_referred_salon IS DISTINCT FROM NEW.salon_id OR
     v_token_salon    IS DISTINCT FROM NEW.salon_id OR
     v_appt_salon     IS DISTINCT FROM NEW.salon_id
  THEN
    RAISE EXCEPTION 'Todos os refs (referrer, referred, token, appointment) devem pertencer ao mesmo salon_id (%)',
      NEW.salon_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER referrals_validate_salon_consistency
  BEFORE INSERT OR UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.validate_referral_salon_consistency();

-- ---------------------------------------------------------
-- Function: slot availability check (helper for Server Actions)
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_appointment_conflict(
  p_salon_id UUID,
  p_professional_id UUID,
  p_scheduled_at TIMESTAMPTZ,
  p_duration_minutes INT,
  p_exclude_appointment_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.appointments
    WHERE salon_id = p_salon_id
      AND professional_id = p_professional_id
      AND status NOT IN ('CANCELED', 'NO_SHOW')
      AND deleted_at IS NULL
      AND (p_exclude_appointment_id IS NULL OR id <> p_exclude_appointment_id)
      AND tstzrange(scheduled_at, scheduled_at + (duration_minutes || ' minutes')::interval, '[)')
          && tstzrange(p_scheduled_at, p_scheduled_at + (p_duration_minutes || ' minutes')::interval, '[)')
  );
$$;

COMMENT ON FUNCTION public.check_appointment_conflict IS
  'Retorna TRUE se há conflito de horário para o profissional. Usado em Server Actions antes de inserir agendamento.';

-- ---------------------------------------------------------
-- Function: daily messaging cost by salon (dashboard de custo)
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.salon_messaging_cost_month(
  p_salon_id UUID,
  p_year INT DEFAULT EXTRACT(YEAR FROM NOW())::INT,
  p_month INT DEFAULT EXTRACT(MONTH FROM NOW())::INT
)
RETURNS NUMERIC(10,2)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(cost_brl), 0)::NUMERIC(10,2)
    FROM public.messaging_log
   WHERE salon_id = p_salon_id
     AND direction = 'OUTBOUND'
     AND EXTRACT(YEAR FROM created_at) = p_year
     AND EXTRACT(MONTH FROM created_at) = p_month;
$$;

COMMENT ON FUNCTION public.salon_messaging_cost_month IS
  'Retorna custo total de mensagens OUTBOUND do salão no mês. Alerta quando > R$ 15 (NFR9).';

-- ---------------------------------------------------------
-- Function: clean up expired referral tokens (Inngest cron job)
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cleanup_expired_referral_tokens()
RETURNS INT
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  WITH deleted AS (
    DELETE FROM public.referral_tokens
    WHERE expires_at < NOW() - INTERVAL '7 days'
      AND NOT EXISTS (
        SELECT 1 FROM public.referrals r WHERE r.referral_token_id = referral_tokens.id
      )
    RETURNING id
  )
  SELECT COUNT(*)::INT FROM deleted;
$$;

COMMENT ON FUNCTION public.cleanup_expired_referral_tokens IS
  'Remove tokens expirados há mais de 7 dias QUE NÃO foram usados em indicações. Chamada via Inngest cron diário.';

COMMIT;
