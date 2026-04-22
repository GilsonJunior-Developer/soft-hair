-- =========================================================
-- SoftHair — Appointment conflict prevention
-- Migration: 20260422000001_appointment_conflict_constraint
-- Author: Dara (Data Engineer Agent) — Epic 2 Sprint 2.A pre-flight
-- Generated: 2026-04-21
-- Context: Stories 2.2 + 2.4 need race-free guarantee that no two
--          active appointments overlap for the same professional.
-- Approach: GiST EXCLUDE constraint on (professional_id, tstzrange).
--          Declarative, 100% race-free at DB level. RPC wrapper
--          (added in Story 2.2) handles user-facing message.
-- =========================================================

BEGIN;

-- ---------------------------------------------------------
-- Ensure btree_gist extension (required for "=" comparison
-- on non-range columns inside an EXCLUDE USING gist clause)
-- ---------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS btree_gist SCHEMA extensions;

-- ---------------------------------------------------------
-- Drop prior version (idempotent re-runs)
-- ---------------------------------------------------------
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_no_professional_overlap;

-- ---------------------------------------------------------
-- EXCLUDE constraint — same professional, overlapping range,
-- only for active statuses (PENDING / CONFIRMED). COMPLETED /
-- NO_SHOW / CANCELED appointments can coexist with new ones
-- in the same slot (historical records, not active bookings).
-- ---------------------------------------------------------
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_no_professional_overlap
  EXCLUDE USING gist (
    professional_id WITH =,
    tstzrange(scheduled_at, ends_at, '[)') WITH &&
  )
  WHERE (status IN ('PENDING_CONFIRMATION', 'CONFIRMED'));

COMMENT ON CONSTRAINT appointments_no_professional_overlap ON public.appointments IS
  'Prevents overlapping active appointments for the same professional.
   Declarative race-free guarantee. App-level RPCs wrap INSERT to
   translate exclusion_violation (23P01) into user-friendly messages.';

COMMIT;

-- Verification query (run manually):
-- SELECT conname, contype, pg_get_constraintdef(oid)
--   FROM pg_constraint
--  WHERE conname = 'appointments_no_professional_overlap';
-- Expected: 1 row, contype='x'

-- Integration hint for @dev (Story 2.2):
--   When INSERT violates, Postgres raises with SQLSTATE '23P01'.
--   Map to { ok: false, error: 'Horário já ocupado', code: 'CONFLICT' }.
