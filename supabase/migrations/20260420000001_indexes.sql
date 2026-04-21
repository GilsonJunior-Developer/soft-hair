-- =========================================================
-- SoftHair — Indexes (critical for performance)
-- Migration: 20260420000001_indexes
-- Author: Dara (Data Engineer Agent)
-- Generated: 2026-04-20
-- =========================================================
--
-- Rationale: índices derivados dos access patterns documentados
-- no architecture.md + front-end-spec.md (CalendarView, /clientes
-- search, dashboard de custo).
-- =========================================================

BEGIN;

-- ---------------------------------------------------------
-- users
-- ---------------------------------------------------------
-- phone_e164 já tem unique index (UNIQUE constraint)
CREATE INDEX IF NOT EXISTS idx_users_default_salon
  ON public.users (default_salon_id)
  WHERE default_salon_id IS NOT NULL;

-- ---------------------------------------------------------
-- salons
-- ---------------------------------------------------------
-- slug unique já indexado
CREATE INDEX IF NOT EXISTS idx_salons_owner
  ON public.salons (owner_user_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_salons_subscription
  ON public.salons (subscription_status, trial_ends_at)
  WHERE deleted_at IS NULL;

-- ---------------------------------------------------------
-- salon_members
-- ---------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_salon_members_user
  ON public.salon_members (user_id);

CREATE INDEX IF NOT EXISTS idx_salon_members_salon
  ON public.salon_members (salon_id);

-- ---------------------------------------------------------
-- professionals
-- ---------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_professionals_salon_active
  ON public.professionals (salon_id, is_active)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_professionals_user
  ON public.professionals (user_id)
  WHERE user_id IS NOT NULL;

-- ---------------------------------------------------------
-- services
-- ---------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_services_salon_active
  ON public.services (salon_id, is_active)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_services_catalog
  ON public.services (catalog_id)
  WHERE catalog_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_services_category
  ON public.services (salon_id, category)
  WHERE deleted_at IS NULL;

-- ---------------------------------------------------------
-- clients
-- ---------------------------------------------------------
-- (salon_id, phone_e164) unique já indexado
CREATE INDEX IF NOT EXISTS idx_clients_salon_name
  ON public.clients (salon_id, name)
  WHERE deleted_at IS NULL;

-- Busca textual em name (suporte futuro a ILIKE '%termo%')
-- Note: gin_trgm_ops é qualified com extensions. (Supabase convention)
CREATE INDEX IF NOT EXISTS idx_clients_name_trgm
  ON public.clients USING gin (name extensions.gin_trgm_ops)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_clients_credit_balance
  ON public.clients (salon_id)
  WHERE credit_balance_brl > 0 AND deleted_at IS NULL;

-- ---------------------------------------------------------
-- appointments — índices CRÍTICOS
-- ---------------------------------------------------------

-- Conflict detection (profissional X tem algo em Y?)
CREATE INDEX IF NOT EXISTS idx_appointments_professional_time
  ON public.appointments (salon_id, professional_id, scheduled_at)
  WHERE deleted_at IS NULL AND status NOT IN ('CANCELED', 'NO_SHOW');

-- CalendarView — dashboard "Hoje" + agenda do dia
CREATE INDEX IF NOT EXISTS idx_appointments_salon_date
  ON public.appointments (salon_id, scheduled_at)
  WHERE deleted_at IS NULL;

-- Status filter para dashboards
CREATE INDEX IF NOT EXISTS idx_appointments_status
  ON public.appointments (salon_id, status, scheduled_at)
  WHERE deleted_at IS NULL;

-- Busca por cliente (histórico)
CREATE INDEX IF NOT EXISTS idx_appointments_client
  ON public.appointments (client_id, scheduled_at DESC)
  WHERE deleted_at IS NULL;

-- Agenda individual do profissional
CREATE INDEX IF NOT EXISTS idx_appointments_professional_scheduled
  ON public.appointments (professional_id, scheduled_at DESC)
  WHERE deleted_at IS NULL;

-- Referral lookup
CREATE INDEX IF NOT EXISTS idx_appointments_referral_token
  ON public.appointments (referral_token_id)
  WHERE referral_token_id IS NOT NULL;

-- ---------------------------------------------------------
-- appointment_status_log
-- ---------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_appointment_status_log_appt
  ON public.appointment_status_log (appointment_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_appointment_status_log_salon
  ON public.appointment_status_log (salon_id, created_at DESC);

-- ---------------------------------------------------------
-- commission_entries
-- ---------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_commission_entries_professional
  ON public.commission_entries (salon_id, professional_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_commission_entries_settled
  ON public.commission_entries (salon_id, settled_at)
  WHERE settled_at IS NOT NULL;

-- ---------------------------------------------------------
-- invoices
-- ---------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_invoices_salon_status
  ON public.invoices (salon_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoices_pending_retry
  ON public.invoices (status, retry_count)
  WHERE status IN ('PENDING', 'FAILED');

-- ---------------------------------------------------------
-- referral_tokens
-- ---------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_referral_tokens_referrer
  ON public.referral_tokens (salon_id, referrer_client_id);

CREATE INDEX IF NOT EXISTS idx_referral_tokens_expires
  ON public.referral_tokens (expires_at);
-- Nota: index é full (não-partial). Postgres rejeita WHERE expires_at > NOW()
-- em predicate porque NOW() não é IMMUTABLE (é STABLE). Cleanup function
-- filtra expired em runtime — performance OK.

-- ---------------------------------------------------------
-- referrals
-- ---------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_referrals_referrer
  ON public.referrals (salon_id, referrer_client_id);

CREATE INDEX IF NOT EXISTS idx_referrals_status
  ON public.referrals (salon_id, status);

-- ---------------------------------------------------------
-- client_credits_log
-- ---------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_credits_log_client
  ON public.client_credits_log (client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_credits_log_salon
  ON public.client_credits_log (salon_id, created_at DESC);

-- ---------------------------------------------------------
-- messaging_log — dashboard de custo
-- ---------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_messaging_log_salon_date
  ON public.messaging_log (salon_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messaging_log_cost
  ON public.messaging_log (salon_id, created_at)
  WHERE cost_brl IS NOT NULL AND cost_brl > 0;

CREATE INDEX IF NOT EXISTS idx_messaging_log_appointment
  ON public.messaging_log (appointment_id, created_at DESC)
  WHERE appointment_id IS NOT NULL;

-- ---------------------------------------------------------
-- whatsapp_templates
-- ---------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_wa_templates_status
  ON public.whatsapp_templates (meta_status, name);

COMMIT;

-- =========================================================
-- Nota: pg_trgm extension requerida para busca fuzzy de clientes.
-- Adicionar manualmente no Supabase Dashboard ou rodar:
--   CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- (Não incluído aqui porque algumas configs de Supabase restringem CREATE EXTENSION)
-- =========================================================
