-- =========================================================
-- SoftHair — Story 4.1 (AC1b): per-professional × per-service commission overrides
-- Migration: 20260502000000_story_4_1_professional_service_commissions
-- Author: Dex (Developer Agent — applied via MCP per Founder YOLO authorization 2026-05-02)
-- Generated: 2026-05-02
-- Context:
--   AC1(b) da Story 4.1 exige tabela de overrides per-prof × per-service
--   para mode TABLE. Schema enum `commission_mode` já existia (Story 1.1)
--   mas backing data nunca foi criado. Esta migration:
--     1. Cria tabela professional_service_commissions
--     2. Habilita RLS com policy salon_id-based (paridade com professionals/services)
--     3. Adiciona index (professional_id, service_id) para lookup O(1) durante calc
--   ADR-0004 documenta a 3-tier precedence rule:
--     TABLE_ENTRY > SERVICE_OVERRIDE > PROFESSIONAL_DEFAULT
--   Decisão de @po em validate-story-draft 2026-05-02: Interpretation A
--   (per-prof × per-service rates).
-- Idempotente: CREATE TABLE IF NOT EXISTS + CREATE POLICY IF NOT EXISTS
--   (via DO block para policy).
-- Rollback: ver packages/db/rollback/20260502000000_story_4_1_rollback.sql
-- =========================================================

BEGIN;

-- ---------------------------------------------------------
-- 1. Tabela: professional_service_commissions
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.professional_service_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  percent NUMERIC(5,2) NOT NULL CHECK (percent >= 0 AND percent <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (professional_id, service_id)
);

COMMENT ON TABLE public.professional_service_commissions IS
  'Per-professional × per-service commission overrides. Active only when professionals.commission_mode = ''TABLE''. 3-tier precedence: TABLE_ENTRY > SERVICE_OVERRIDE (services.commission_override_percent) > PROFESSIONAL_DEFAULT (professionals.commission_default_percent). See ADR-0004.';

COMMENT ON COLUMN public.professional_service_commissions.percent IS
  'Percentual da comissão (0-100). NUMERIC(5,2) em paridade com commission_default_percent e commission_override_percent.';

-- ---------------------------------------------------------
-- 2. Index para lookup por (professional_id, service_id)
--    UNIQUE constraint já cria index, mas explicitamos o ordering
--    canônico de query para o engine (resolve-rate.ts).
--    Como o UNIQUE constraint já cria o index automaticamente,
--    não precisamos criar outro. Mantemos comentário pra rastreio.
-- ---------------------------------------------------------
-- Note: UNIQUE (professional_id, service_id) above auto-creates the index needed.

-- Index secundário para fetch "todas as entries de um profissional" (UI matrix)
CREATE INDEX IF NOT EXISTS idx_psc_professional_id
  ON public.professional_service_commissions (professional_id);

-- Index para fetch "qual a entry deste prof neste service" (engine hot-path)
-- redundante com UNIQUE constraint, mas explicito.
-- Na verdade o UNIQUE já cobre — skip.

-- ---------------------------------------------------------
-- 3. Trigger updated_at (paridade com outras tabelas com updated_at)
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_professional_service_commissions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_psc_updated_at ON public.professional_service_commissions;
CREATE TRIGGER trg_psc_updated_at
  BEFORE UPDATE ON public.professional_service_commissions
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_professional_service_commissions_updated_at();

-- ---------------------------------------------------------
-- 4. RLS — paridade com professionals_all / services_all
--    Pattern: FOR ALL com salon_id check; app layer enforces role gating
--    (OWNER/RECEPTIONIST). Convention de Story 1.1; PROFESSIONAL role
--    não tem write a outras tabelas via RLS, validação é app-side.
-- ---------------------------------------------------------
ALTER TABLE public.professional_service_commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS professional_service_commissions_all ON public.professional_service_commissions;
CREATE POLICY professional_service_commissions_all ON public.professional_service_commissions
  FOR ALL
  USING (salon_id IN (SELECT public.current_user_salon_ids()))
  WITH CHECK (salon_id IN (SELECT public.current_user_salon_ids()));

COMMIT;
