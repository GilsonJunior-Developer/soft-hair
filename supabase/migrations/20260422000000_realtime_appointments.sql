-- =========================================================
-- SoftHair — Realtime publication for appointments
-- Migration: 20260422000000_realtime_appointments
-- Author: Dara (Data Engineer Agent) — Epic 2 Sprint 2.A pre-flight
-- Generated: 2026-04-21
-- Context: Story 2.1 agenda view consumes INSERT/UPDATE/DELETE on
--          `appointments` via @supabase/supabase-js Realtime client.
--          Supabase default: publication `supabase_realtime` exists
--          but empty — tables must be added explicitly.
-- Safe: idempotent (uses DO block to check before ALTER).
-- =========================================================

BEGIN;

-- ---------------------------------------------------------
-- Add public.appointments to supabase_realtime publication
-- ---------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND schemaname = 'public'
       AND tablename = 'appointments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
  END IF;
END $$;

-- ---------------------------------------------------------
-- REPLICA IDENTITY FULL — required so UPDATE payloads include
-- the OLD row values (needed to know what changed on the client)
-- ---------------------------------------------------------
ALTER TABLE public.appointments REPLICA IDENTITY FULL;

COMMIT;

-- Verification query (run manually):
-- SELECT schemaname, tablename FROM pg_publication_tables
--  WHERE pubname = 'supabase_realtime' AND tablename = 'appointments';
-- Expected: 1 row
