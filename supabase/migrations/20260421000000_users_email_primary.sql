-- =========================================================
-- SoftHair — Users schema adjustment for email magic link MVP
-- Migration: 20260421000000_users_email_primary
-- Author: Dex (Dev Agent) — Story 1.3 Task 1
-- Generated: 2026-04-21
-- Context: scope change 2026-04-21 — WhatsApp auth deferred to Phase 2.
--          Email is primary identity for MVP. phone_e164 becomes nullable
--          (Phase 2 will repopulate when WhatsApp integration returns).
-- =========================================================

BEGIN;

-- ---------------------------------------------------------
-- Step 1: Make phone_e164 nullable
-- ---------------------------------------------------------
-- Phase 2 will re-require phone when WhatsApp auth returns.
-- For MVP, owner pode ou não fornecer telefone — email é suficiente.
ALTER TABLE public.users ALTER COLUMN phone_e164 DROP NOT NULL;

-- ---------------------------------------------------------
-- Step 2: Make email NOT NULL UNIQUE (primary identity for MVP)
-- ---------------------------------------------------------
-- A tabela já tinha email como CITEXT NULLABLE. Agora vira NOT NULL UNIQUE.
--
-- PRODUCTION SAFETY NOTE: este ALTER NOT NULL falharia se existissem rows
-- com email=NULL. Como softhair-dev foi recém-populado sem usuários reais
-- (schema aplicado 2026-04-20 mas sem signup), é seguro aplicar direto.
-- Se houver data no futuro, backfill antes do NOT NULL é necessário.
ALTER TABLE public.users ALTER COLUMN email SET NOT NULL;

-- UNIQUE constraint on email
ALTER TABLE public.users
  ADD CONSTRAINT users_email_unique UNIQUE (email);

-- Format check (basic RFC5322-ish; server-side Zod é primary validation)
ALTER TABLE public.users
  ADD CONSTRAINT users_email_format
  CHECK (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$');

COMMIT;
