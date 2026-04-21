-- =========================================================
-- SoftHair — Auth user creation trigger
-- Migration: 20260421000001_auth_user_trigger
-- Author: Dex (Dev Agent) — Story 1.3 Task 2
-- Generated: 2026-04-21
-- Context: Supabase Auth manages auth.users. When new row is created
--          (email magic link signup), we mirror it to public.users
--          automatically via trigger. Resolves MEDIUM-2 from
--          security-audit-2026-04-20.md.
-- =========================================================

BEGIN;

-- ---------------------------------------------------------
-- Function: handle_new_auth_user
-- ---------------------------------------------------------
-- SECURITY DEFINER is required to insert into public.users from auth
-- schema (RLS would otherwise block). `SET search_path = public` prevents
-- schema-hijack attacks.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, phone_e164)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.phone  -- nullable in public.users now; populated only if Supabase Auth has it
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_auth_user() IS
  'Mirror auth.users INSERT into public.users. Runs AFTER INSERT trigger.
   Name defaults to email prefix if raw_user_meta_data.name is absent.
   Phase 2 will extend this to handle phone_e164 from WhatsApp flows.';

-- ---------------------------------------------------------
-- Trigger: on_auth_user_created
-- ---------------------------------------------------------
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ---------------------------------------------------------
-- Drop legacy users_insert RLS policy (inserts are now trigger-only)
-- ---------------------------------------------------------
-- Previously app-layer (via service_role) could INSERT into public.users.
-- With trigger in place, all inserts happen via auth.users signup flow.
-- Removing this policy closes an attack vector where a compromised
-- service_role-wrapped endpoint could manufacture public.users rows
-- without a matching auth.users (orphan).
DROP POLICY IF EXISTS users_insert ON public.users;

COMMIT;
