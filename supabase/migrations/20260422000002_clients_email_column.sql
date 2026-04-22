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
