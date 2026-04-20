-- =========================================================
-- SoftHair — Rollback do Initial Schema
-- Migration: 20260420000000_initial_schema
-- Author: Dara (Data Engineer Agent)
-- Generated: 2026-04-20
-- =========================================================
--
-- USO: aplicar EM CASO DE EMERGÊNCIA para reverter o schema
-- inicial. CUIDADO: deleta TODOS os dados de domínio.
--
-- Para ambientes de produção, preferir snapshot + restore via
-- Supabase Point-in-Time Recovery (PITR) em vez deste script.
-- =========================================================

BEGIN;

-- ---------------------------------------------------------
-- Drop triggers (depende das funções)
-- ---------------------------------------------------------
DROP TRIGGER IF EXISTS referrals_validate_salon_consistency ON public.referrals;
DROP TRIGGER IF EXISTS appointments_validate_salon_consistency ON public.appointments;
DROP TRIGGER IF EXISTS credits_log_immutable_delete ON public.client_credits_log;
DROP TRIGGER IF EXISTS credits_log_immutable_update ON public.client_credits_log;
DROP TRIGGER IF EXISTS credits_log_sync_balance ON public.client_credits_log;
DROP TRIGGER IF EXISTS status_log_immutable_delete ON public.appointment_status_log;
DROP TRIGGER IF EXISTS status_log_immutable_update ON public.appointment_status_log;
DROP TRIGGER IF EXISTS appointments_status_log ON public.appointments;

DROP TRIGGER IF EXISTS users_set_updated_at ON public.users;
DROP TRIGGER IF EXISTS salons_set_updated_at ON public.salons;
DROP TRIGGER IF EXISTS professionals_set_updated_at ON public.professionals;
DROP TRIGGER IF EXISTS services_set_updated_at ON public.services;
DROP TRIGGER IF EXISTS clients_set_updated_at ON public.clients;
DROP TRIGGER IF EXISTS appointments_set_updated_at ON public.appointments;
DROP TRIGGER IF EXISTS invoices_set_updated_at ON public.invoices;

-- ---------------------------------------------------------
-- Drop functions
-- ---------------------------------------------------------
DROP FUNCTION IF EXISTS public.cleanup_expired_referral_tokens();
DROP FUNCTION IF EXISTS public.salon_messaging_cost_month(UUID, INT, INT);
DROP FUNCTION IF EXISTS public.check_appointment_conflict(UUID, UUID, TIMESTAMPTZ, INT, UUID);
DROP FUNCTION IF EXISTS public.validate_referral_salon_consistency();
DROP FUNCTION IF EXISTS public.validate_appointment_salon_consistency();
DROP FUNCTION IF EXISTS public.prevent_credits_log_mutation();
DROP FUNCTION IF EXISTS public.sync_client_credit_balance();
DROP FUNCTION IF EXISTS public.log_appointment_status_change();
DROP FUNCTION IF EXISTS public.is_salon_owner(UUID);
DROP FUNCTION IF EXISTS public.is_superadmin();
DROP FUNCTION IF EXISTS public.current_user_salon_ids();
DROP FUNCTION IF EXISTS set_updated_at();

-- ---------------------------------------------------------
-- Drop tables (ordem reversa para respeitar FKs)
-- ---------------------------------------------------------
DROP TABLE IF EXISTS public.messaging_log CASCADE;
DROP TABLE IF EXISTS public.client_credits_log CASCADE;
DROP TABLE IF EXISTS public.referrals CASCADE;
DROP TABLE IF EXISTS public.referral_tokens CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.commission_entries CASCADE;
DROP TABLE IF EXISTS public.appointment_status_log CASCADE;
DROP TABLE IF EXISTS public.appointments CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.services CASCADE;
DROP TABLE IF EXISTS public.professionals CASCADE;
DROP TABLE IF EXISTS public.service_catalog CASCADE;
DROP TABLE IF EXISTS public.whatsapp_templates CASCADE;
DROP TABLE IF EXISTS public.salon_members CASCADE;
DROP TABLE IF EXISTS public.salons CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- ---------------------------------------------------------
-- Drop enums
-- ---------------------------------------------------------
DROP TYPE IF EXISTS subscription_status;
DROP TYPE IF EXISTS wa_template_status;
DROP TYPE IF EXISTS wa_template_category;
DROP TYPE IF EXISTS messaging_status;
DROP TYPE IF EXISTS messaging_direction;
DROP TYPE IF EXISTS messaging_channel;
DROP TYPE IF EXISTS referral_status;
DROP TYPE IF EXISTS invoice_provider;
DROP TYPE IF EXISTS invoice_status;
DROP TYPE IF EXISTS appointment_source;
DROP TYPE IF EXISTS appointment_status;
DROP TYPE IF EXISTS commission_mode;
DROP TYPE IF EXISTS user_role;

-- ---------------------------------------------------------
-- Extensions (preservamos — raramente devem ser removidas)
-- ---------------------------------------------------------
-- DROP EXTENSION IF EXISTS "citext";
-- DROP EXTENSION IF EXISTS "pgcrypto";
-- DROP EXTENSION IF EXISTS "uuid-ossp";

COMMIT;
