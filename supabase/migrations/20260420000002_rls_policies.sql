-- =========================================================
-- SoftHair — Row-Level Security Policies
-- Migration: 20260420000002_rls_policies
-- Author: Dara (Data Engineer Agent)
-- Generated: 2026-04-20
-- Architecture ref: docs/architecture.md v1.1 (NFR5, Security)
-- =========================================================
--
-- Princípio: multi-tenancy enforced a nível de banco.
-- Usuário só vê/modifica rows do(s) salão(ões) onde é member.
-- service_catalog e whatsapp_templates são públicos (read-only).
-- =========================================================

BEGIN;

-- ---------------------------------------------------------
-- Helper function: retorna salão(ões) do usuário autenticado
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_salon_ids()
RETURNS SETOF UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT salon_id FROM public.salon_members WHERE user_id = auth.uid();
$$;

COMMENT ON FUNCTION public.current_user_salon_ids() IS
  'Retorna set de salon_id onde o user autenticado é member. Usado em RLS policies. SECURITY DEFINER para bypassar RLS em salon_members (caso contrário seria recursivo).';

-- ---------------------------------------------------------
-- Helper function: verifica se usuário é superadmin
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_superadmin FROM public.users WHERE id = auth.uid()), FALSE);
$$;

COMMENT ON FUNCTION public.is_superadmin() IS 'Flag founder-only para gerenciar templates WhatsApp globais.';

-- ---------------------------------------------------------
-- Helper function: verifica se usuário é OWNER de salão
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_salon_owner(p_salon_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.salon_members
    WHERE user_id = auth.uid()
      AND salon_id = p_salon_id
      AND role = 'OWNER'
  );
$$;

-- =========================================================
-- ENABLE RLS em todas as tabelas de domínio
-- =========================================================

ALTER TABLE public.users                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salons                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salon_members           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professionals           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_status_log  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_entries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_tokens         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_credits_log      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messaging_log           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_catalog         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_templates      ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- POLICIES — users
-- =========================================================

-- User pode ler o próprio registro + registros de co-membros do mesmo salão (para exibir "criado por X")
CREATE POLICY users_select ON public.users
  FOR SELECT
  USING (
    id = auth.uid()
    OR id IN (
      SELECT user_id FROM public.salon_members
      WHERE salon_id IN (SELECT public.current_user_salon_ids())
    )
  );

-- User só atualiza o próprio registro
CREATE POLICY users_update ON public.users
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Insert é controlado pelo Supabase Auth (trigger em auth.users)
CREATE POLICY users_insert ON public.users
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- =========================================================
-- POLICIES — salons
-- =========================================================

-- HIGH-3 fix: fallback owner_user_id permite ler salão recém-criado
-- antes do registro em salon_members estar disponível (bootstrap).
CREATE POLICY salons_select ON public.salons
  FOR SELECT
  USING (
    id IN (SELECT public.current_user_salon_ids())
    OR owner_user_id = auth.uid()
  );

-- Apenas OWNER pode criar salão (via signup flow — app enforced)
CREATE POLICY salons_insert ON public.salons
  FOR INSERT
  WITH CHECK (owner_user_id = auth.uid());

-- Apenas OWNER pode atualizar salão
CREATE POLICY salons_update ON public.salons
  FOR UPDATE
  USING (public.is_salon_owner(id))
  WITH CHECK (public.is_salon_owner(id));

-- Delete = soft delete via UPDATE deleted_at; nenhum hard delete
-- (Mas deixamos policy restritiva para segurança)
CREATE POLICY salons_delete ON public.salons
  FOR DELETE
  USING (FALSE); -- hard delete bloqueado

-- =========================================================
-- POLICIES — salon_members
-- =========================================================

CREATE POLICY salon_members_select ON public.salon_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR salon_id IN (SELECT public.current_user_salon_ids())
  );

-- HIGH-1 fix: permite OWNER existente adicionar membros OU user bootstrap
-- (adicionar a si mesmo como OWNER num salão que acabou de criar).
-- Resolve chicken-and-egg problem no signup flow.
CREATE POLICY salon_members_insert ON public.salon_members
  FOR INSERT
  WITH CHECK (
    -- Caso 1: OWNER existente adicionando outro membro
    public.is_salon_owner(salon_id)
    -- Caso 2: Bootstrap — user adicionando a si mesmo como OWNER
    -- num salão que ele é o owner_user_id (criou)
    OR (
      user_id = auth.uid()
      AND role = 'OWNER'
      AND EXISTS (
        SELECT 1 FROM public.salons
        WHERE id = salon_id
          AND owner_user_id = auth.uid()
      )
    )
  );

-- Apenas OWNER pode atualizar (mudar role)
CREATE POLICY salon_members_update ON public.salon_members
  FOR UPDATE
  USING (public.is_salon_owner(salon_id))
  WITH CHECK (public.is_salon_owner(salon_id));

-- Apenas OWNER pode remover membro (exceto si mesmo via app guard)
CREATE POLICY salon_members_delete ON public.salon_members
  FOR DELETE
  USING (public.is_salon_owner(salon_id));

-- =========================================================
-- POLICIES genéricas para tabelas com salon_id
-- Pattern: SELECT/INSERT/UPDATE/DELETE onde salon_id é do user
-- =========================================================

-- professionals
CREATE POLICY professionals_all ON public.professionals
  FOR ALL
  USING (salon_id IN (SELECT public.current_user_salon_ids()))
  WITH CHECK (salon_id IN (SELECT public.current_user_salon_ids()));

-- services
CREATE POLICY services_all ON public.services
  FOR ALL
  USING (salon_id IN (SELECT public.current_user_salon_ids()))
  WITH CHECK (salon_id IN (SELECT public.current_user_salon_ids()));

-- clients
CREATE POLICY clients_all ON public.clients
  FOR ALL
  USING (salon_id IN (SELECT public.current_user_salon_ids()))
  WITH CHECK (salon_id IN (SELECT public.current_user_salon_ids()));

-- appointments
CREATE POLICY appointments_all ON public.appointments
  FOR ALL
  USING (salon_id IN (SELECT public.current_user_salon_ids()))
  WITH CHECK (salon_id IN (SELECT public.current_user_salon_ids()));

-- appointment_status_log (read-only para app; inserts via trigger)
CREATE POLICY appointment_status_log_select ON public.appointment_status_log
  FOR SELECT
  USING (salon_id IN (SELECT public.current_user_salon_ids()));

-- Insert em status_log é bloqueado para app — apenas via trigger (SECURITY DEFINER)
-- Por isso deixamos sem policy de INSERT explícita.
-- (Triggers com SECURITY DEFINER bypassam RLS.)

-- commission_entries (read-only para app; inserts via Inngest worker com service_role key)
CREATE POLICY commission_entries_select ON public.commission_entries
  FOR SELECT
  USING (salon_id IN (SELECT public.current_user_salon_ids()));

-- invoices
CREATE POLICY invoices_all ON public.invoices
  FOR ALL
  USING (salon_id IN (SELECT public.current_user_salon_ids()))
  WITH CHECK (salon_id IN (SELECT public.current_user_salon_ids()));

-- referral_tokens
CREATE POLICY referral_tokens_all ON public.referral_tokens
  FOR ALL
  USING (salon_id IN (SELECT public.current_user_salon_ids()))
  WITH CHECK (salon_id IN (SELECT public.current_user_salon_ids()));

-- referrals (read para app; insert/update via worker)
CREATE POLICY referrals_select ON public.referrals
  FOR SELECT
  USING (salon_id IN (SELECT public.current_user_salon_ids()));

-- client_credits_log (read-only para app; inserts via trigger + worker)
CREATE POLICY credits_log_select ON public.client_credits_log
  FOR SELECT
  USING (salon_id IN (SELECT public.current_user_salon_ids()));

-- messaging_log (read-only)
CREATE POLICY messaging_log_select ON public.messaging_log
  FOR SELECT
  USING (salon_id IN (SELECT public.current_user_salon_ids()));

-- =========================================================
-- POLICIES — service_catalog (público, read-only)
-- =========================================================

-- SELECT público (anônimo autorizado)
CREATE POLICY service_catalog_public_read ON public.service_catalog
  FOR SELECT
  USING (TRUE);

-- INSERT/UPDATE/DELETE apenas superadmin
CREATE POLICY service_catalog_superadmin_write ON public.service_catalog
  FOR ALL
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- =========================================================
-- POLICIES — whatsapp_templates (superadmin-only write)
-- =========================================================

-- SELECT para qualquer autenticado (app consulta status do template ao renderizar dashboard)
CREATE POLICY wa_templates_auth_read ON public.whatsapp_templates
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Write apenas superadmin
CREATE POLICY wa_templates_superadmin_write ON public.whatsapp_templates
  FOR ALL
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- =========================================================
-- Public endpoints (booking via link público) usam service_role
-- Não há policy específica — service_role bypassa RLS (usado em
-- Server Actions controladas em /api/public/*).
-- App layer é responsável por validar token/rate limit antes
-- de tocar no banco com service_role.
-- =========================================================

COMMIT;

-- =========================================================
-- Nota sobre service_role:
-- Operações públicas (link de booking, webhooks de BSP, jobs
-- do Inngest) executam com service_role key, que bypassa RLS.
-- A segurança nesses paths é responsabilidade do app layer:
--   1. Validação do token (cancel_token, referral_token)
--   2. Rate limiting
--   3. Validação de input (Zod)
--   4. Logs de auditoria
-- =========================================================
