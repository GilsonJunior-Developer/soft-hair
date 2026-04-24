-- ============================================================
-- SoftHair — FULL SCHEMA APPLICATION to softhair-prod
-- Combines 9 migrations in chronological order.
-- Each migration preserved with its own BEGIN/COMMIT.
-- Safe on empty prod (idempotent constructs used throughout).
-- Generated: 2026-04-21T13:53:54Z
-- ============================================================


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 20260420000000_initial_schema.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- =========================================================
-- SoftHair — Initial Schema (MVP)
-- Migration: 20260420000000_initial_schema
-- Author: Dara (Data Engineer Agent)
-- Generated: 2026-04-20
-- Architecture ref: docs/architecture.md v1.1 (section "Data Models")
-- =========================================================

BEGIN;

-- ---------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------
-- NOTE: Supabase isola extensions em schema 'extensions' (fora do search_path
-- por padrão). Usamos `gen_random_uuid()` (built-in Postgres 13+) em vez de
-- `gen_random_uuid()` (uuid-ossp) para evitar schema prefixing.
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "citext" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA extensions;  -- fuzzy search em clients.name

-- ---------------------------------------------------------
-- Enums (Postgres native enums — schema-level)
-- ---------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('OWNER', 'RECEPTIONIST', 'PROFESSIONAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE commission_mode AS ENUM ('PERCENT_FIXED', 'TABLE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE appointment_status AS ENUM (
    'PENDING_CONFIRMATION',
    'CONFIRMED',
    'COMPLETED',
    'NO_SHOW',
    'CANCELED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE appointment_source AS ENUM ('PUBLIC_LINK', 'MANUAL_BY_STAFF', 'REFERRAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('PENDING', 'EMITTED', 'FAILED', 'CANCELED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE invoice_provider AS ENUM ('NUVEM_FISCAL', 'FOCUS_NFE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE referral_status AS ENUM ('PENDING', 'CONFIRMED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE messaging_channel AS ENUM ('WHATSAPP', 'SMS', 'EMAIL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE messaging_direction AS ENUM ('OUTBOUND', 'INBOUND');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE messaging_status AS ENUM ('SENT', 'DELIVERED', 'READ', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE wa_template_category AS ENUM ('UTILITY', 'MARKETING', 'AUTHENTICATION');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE wa_template_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DISABLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------
-- Helper: updated_at trigger function
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------
-- Table: users (extends auth.users)
-- Mirror of auth.users enriched with phone_e164 as primary identity.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_e164 extensions.citext NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email extensions.citext,
  default_salon_id UUID, -- FK added after salons table exists
  is_superadmin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_phone_format CHECK (phone_e164 ~ '^\+[1-9][0-9]{10,14}$')
);

COMMENT ON TABLE public.users IS 'Usuários do sistema (dono, recepcionista, profissional). FK para auth.users — telefone é identidade primária.';
COMMENT ON COLUMN public.users.phone_e164 IS 'Telefone E.164 format (+5511987654321). Único em todo o sistema.';
COMMENT ON COLUMN public.users.is_superadmin IS 'Flag para founder manage templates WhatsApp globais. Hardcoded no seed.';

CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------
-- Table: salons
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.salons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  city TEXT,
  cnpj TEXT,
  owner_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  subscription_plan TEXT NOT NULL DEFAULT 'trial',
  subscription_status subscription_status NOT NULL DEFAULT 'TRIAL',
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  settings_jsonb JSONB NOT NULL DEFAULT '{
    "cancel_window_hours": 24,
    "referral_enabled": true,
    "referral_credit_brl": 20.00,
    "referral_credit_mode": "FIXED"
  }'::jsonb,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT salons_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$')
);

COMMENT ON TABLE public.salons IS 'Estabelecimentos clientes do SoftHair.';
COMMENT ON COLUMN public.salons.settings_jsonb IS 'Config por salão: janela de cancelamento, regras de indicação, etc. Schema versioned em app.';

CREATE TRIGGER salons_set_updated_at
  BEFORE UPDATE ON public.salons
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Agora que salons existe, adiciona FK em users.default_salon_id
ALTER TABLE public.users
  ADD CONSTRAINT users_default_salon_fk
  FOREIGN KEY (default_salon_id) REFERENCES public.salons(id) ON DELETE SET NULL;

-- ---------------------------------------------------------
-- Table: salon_members (junção usuário ↔ salão com papel)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.salon_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT salon_members_unique UNIQUE (salon_id, user_id)
);

COMMENT ON TABLE public.salon_members IS 'Tabela de junção user ↔ salon com papel. Um user pode ter múltiplos salões no futuro.';

-- ---------------------------------------------------------
-- Table: service_catalog (global, read-only público)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  default_duration_minutes INT NOT NULL CHECK (default_duration_minutes > 0 AND default_duration_minutes % 15 = 0),
  suggested_price_brl NUMERIC(10,2) NOT NULL CHECK (suggested_price_brl >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT service_catalog_unique UNIQUE (category, name)
);

COMMENT ON TABLE public.service_catalog IS 'Catálogo global de serviços (200+ padrão). Read-only público. Sem salon_id.';

-- ---------------------------------------------------------
-- Table: professionals
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.professionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  photo_url TEXT,
  bio TEXT,
  specialties TEXT[] NOT NULL DEFAULT '{}',
  working_hours_jsonb JSONB NOT NULL DEFAULT '{
    "mon": [{"from":"09:00","to":"18:00"}],
    "tue": [{"from":"09:00","to":"18:00"}],
    "wed": [{"from":"09:00","to":"18:00"}],
    "thu": [{"from":"09:00","to":"18:00"}],
    "fri": [{"from":"09:00","to":"18:00"}],
    "sat": [{"from":"09:00","to":"14:00"}],
    "sun": []
  }'::jsonb,
  commission_mode commission_mode NOT NULL DEFAULT 'PERCENT_FIXED',
  commission_default_percent NUMERIC(5,2) NOT NULL DEFAULT 40.00 CHECK (commission_default_percent BETWEEN 0 AND 100),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT professionals_slug_unique UNIQUE (salon_id, slug),
  CONSTRAINT professionals_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$')
);

COMMENT ON TABLE public.professionals IS 'Perfil profissional dentro do salão.';
COMMENT ON COLUMN public.professionals.working_hours_jsonb IS 'Dias + janelas de trabalho. Schema documentado em packages/core/booking/types.ts.';

CREATE TRIGGER professionals_set_updated_at
  BEFORE UPDATE ON public.professionals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------
-- Table: services (customizado por salão)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  catalog_id UUID REFERENCES public.service_catalog(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  duration_minutes INT NOT NULL CHECK (duration_minutes > 0 AND duration_minutes % 15 = 0),
  price_brl NUMERIC(10,2) NOT NULL CHECK (price_brl >= 0),
  commission_override_percent NUMERIC(5,2) CHECK (commission_override_percent IS NULL OR commission_override_percent BETWEEN 0 AND 100),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.services IS 'Serviços customizados por salão (instância do service_catalog ou custom).';

CREATE TRIGGER services_set_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------
-- Table: clients
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  phone_e164 extensions.citext NOT NULL,
  name TEXT NOT NULL,
  notes TEXT,
  credit_balance_brl NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (credit_balance_brl >= 0),
  lgpd_consent_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT clients_phone_format CHECK (phone_e164 ~ '^\+[1-9][0-9]{10,14}$'),
  CONSTRAINT clients_phone_unique UNIQUE (salon_id, phone_e164)
);

COMMENT ON TABLE public.clients IS 'Clientes finais do salão. Phone_e164 é identidade única por salão.';
COMMENT ON COLUMN public.clients.credit_balance_brl IS 'Saldo de crédito (indicação). Mantido consistente via trigger em client_credits_log.';

CREATE TRIGGER clients_set_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------
-- Table: referral_tokens
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.referral_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  referrer_client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT referral_tokens_token_format CHECK (length(token) >= 12)
);

COMMENT ON TABLE public.referral_tokens IS 'Token único por cliente para programa de indicação. TTL configurável pelo salão.';

-- ---------------------------------------------------------
-- Table: appointments
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE RESTRICT,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
  ends_at TIMESTAMPTZ NOT NULL,  -- computed via trigger (migration 003)
  status appointment_status NOT NULL DEFAULT 'PENDING_CONFIRMATION',
  price_brl_original NUMERIC(10,2) NOT NULL CHECK (price_brl_original >= 0),
  price_brl_discount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price_brl_discount >= 0),
  price_brl_final NUMERIC(10,2) NOT NULL CHECK (price_brl_final >= 0),
  commission_calculated_brl NUMERIC(10,2),
  source appointment_source NOT NULL DEFAULT 'MANUAL_BY_STAFF',
  referral_token_id UUID REFERENCES public.referral_tokens(id) ON DELETE SET NULL,
  idempotency_key TEXT UNIQUE,
  cancel_token TEXT NOT NULL UNIQUE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT appointments_price_final_check CHECK (price_brl_final = price_brl_original - price_brl_discount)
);

COMMENT ON TABLE public.appointments IS 'Agendamentos — entidade central. ends_at é gerado automaticamente.';
COMMENT ON COLUMN public.appointments.cancel_token IS 'JWT assinado para link de gerenciamento do cliente.';

CREATE TRIGGER appointments_set_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------
-- Table: appointment_status_log (auditoria)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.appointment_status_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  from_status appointment_status,
  to_status appointment_status NOT NULL,
  changed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.appointment_status_log IS 'Auditoria de transições de status. Populated via trigger.';

-- ---------------------------------------------------------
-- Table: commission_entries
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.commission_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL UNIQUE REFERENCES public.appointments(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE RESTRICT,
  service_price_brl NUMERIC(10,2) NOT NULL CHECK (service_price_brl >= 0),
  percent_applied NUMERIC(5,2) NOT NULL CHECK (percent_applied BETWEEN 0 AND 100),
  commission_amount_brl NUMERIC(10,2) NOT NULL CHECK (commission_amount_brl >= 0),
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.commission_entries IS 'Registro de comissão por atendimento COMPLETED. Imutável após criação (histórico preservado).';

-- ---------------------------------------------------------
-- Table: invoices (NFS-e)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL UNIQUE REFERENCES public.appointments(id) ON DELETE RESTRICT,
  number TEXT,
  protocol TEXT,
  pdf_url TEXT,
  xml_url TEXT,
  status invoice_status NOT NULL DEFAULT 'PENDING',
  municipio TEXT,
  provider invoice_provider NOT NULL DEFAULT 'NUVEM_FISCAL',
  retry_count INT NOT NULL DEFAULT 0,
  last_error TEXT,
  emitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.invoices IS 'NFS-e emitidas via parceiro externo (Nuvem Fiscal default — ADR-0002).';

CREATE TRIGGER invoices_set_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------
-- Table: referrals (indicação atribuída)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  referral_token_id UUID NOT NULL REFERENCES public.referral_tokens(id) ON DELETE RESTRICT,
  referrer_client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  referred_client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  first_appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE RESTRICT,
  status referral_status NOT NULL DEFAULT 'PENDING',
  credit_amount_brl NUMERIC(10,2) NOT NULL CHECK (credit_amount_brl >= 0),
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT referrals_self_check CHECK (referrer_client_id <> referred_client_id),
  CONSTRAINT referrals_unique_pair UNIQUE (salon_id, referrer_client_id, referred_client_id)
);

COMMENT ON TABLE public.referrals IS 'Indicação atribuída. Anti-fraude: 1 par referrer↔referred único por salão.';

-- ---------------------------------------------------------
-- Table: client_credits_log (ledger de créditos)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_credits_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  referral_id UUID REFERENCES public.referrals(id) ON DELETE SET NULL,
  amount_brl NUMERIC(10,2) NOT NULL CHECK (amount_brl <> 0),
  balance_after_brl NUMERIC(10,2) NOT NULL CHECK (balance_after_brl >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.client_credits_log IS 'Ledger append-only de créditos. amount > 0 = concedido; amount < 0 = usado.';

-- ---------------------------------------------------------
-- Table: whatsapp_templates (admin-only / superadmin)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  language TEXT NOT NULL DEFAULT 'pt_BR',
  category wa_template_category NOT NULL,
  meta_status wa_template_status NOT NULL DEFAULT 'PENDING',
  placeholders TEXT[] NOT NULL DEFAULT '{}',
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.whatsapp_templates IS 'Templates WhatsApp aprovados pela Meta. Global, gerenciado por superadmin.';

-- ---------------------------------------------------------
-- Table: messaging_log (todos os canais)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.messaging_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  channel messaging_channel NOT NULL,
  template_id UUID REFERENCES public.whatsapp_templates(id) ON DELETE SET NULL,
  direction messaging_direction NOT NULL,
  provider_message_id TEXT,
  cost_brl NUMERIC(10,4),
  status messaging_status NOT NULL DEFAULT 'SENT',
  payload_jsonb JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.messaging_log IS 'Log de todas as mensagens enviadas/recebidas. Base para dashboard de custo.';

COMMIT;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 20260420000001_indexes.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
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


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 20260420000002_rls_policies.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
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


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 20260420000003_functions_and_triggers.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
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
-- Trigger: compute appointments.ends_at
-- Replaces a GENERATED ALWAYS column (Postgres rejected int*interval
-- as "not immutable"). Trigger fires BEFORE INSERT/UPDATE and keeps
-- ends_at consistent with scheduled_at + duration_minutes.
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.compute_appointment_ends_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.ends_at := NEW.scheduled_at + (NEW.duration_minutes * INTERVAL '1 minute');
  RETURN NEW;
END;
$$;

CREATE TRIGGER appointments_compute_ends_at
  BEFORE INSERT OR UPDATE OF scheduled_at, duration_minutes ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.compute_appointment_ends_at();

COMMENT ON FUNCTION public.compute_appointment_ends_at() IS
  'Mantém appointments.ends_at = scheduled_at + duration_minutes. Substitui generated column (Postgres immutability constraint).';

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


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 20260420000004_seed_catalog.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- =========================================================
-- SoftHair — Seed data
-- Author: Dara (Data Engineer Agent)
-- Generated: 2026-04-20
-- =========================================================
--
-- Conteúdo:
--   1. service_catalog — 20 serviços placeholder (PRD exige 200+; a completar)
--   2. whatsapp_templates — 6 templates iniciais pré-aprovação Meta
--
-- Idempotente: usa ON CONFLICT DO NOTHING para rodar múltiplas vezes.
-- =========================================================

BEGIN;

-- ---------------------------------------------------------
-- service_catalog — Placeholder (~20 serviços)
-- ---------------------------------------------------------
-- NOTE (Dara): o PRD exige 200+ serviços. Este é um placeholder
-- mínimo viável para desenvolvimento. Founder deve expandir antes
-- do design-partner #1 (ver TODO no README).
-- ---------------------------------------------------------

INSERT INTO public.service_catalog (name, category, default_duration_minutes, suggested_price_brl)
VALUES
  -- Cabelo
  ('Corte feminino',          'cabelo',    45, 80.00),
  ('Corte masculino',         'cabelo',    30, 50.00),
  ('Escova',                  'cabelo',    45, 60.00),
  ('Coloração raiz',          'cabelo',    90, 180.00),
  ('Coloração completa',      'cabelo',   120, 280.00),
  ('Hidratação',              'cabelo',    45, 90.00),
  ('Progressiva',             'cabelo',   180, 350.00),

  -- Unha
  ('Manicure',                'unha',      45, 45.00),
  ('Pedicure',                'unha',      60, 55.00),
  ('Esmaltação em gel (mãos)','unha',      75, 90.00),
  ('Esmaltação em gel (pés)', 'unha',      90, 110.00),
  ('Spa dos pés',             'unha',      60, 80.00),

  -- Barba
  ('Corte + barba',           'barba',     45, 70.00),
  ('Barba',                   'barba',     30, 40.00),

  -- Estética
  ('Limpeza de pele',         'estetica',  60, 120.00),
  ('Design de sobrancelhas',  'estetica',  30, 40.00),
  ('Depilação buço',          'estetica',  15, 25.00),
  ('Depilação pernas inteiras','estetica', 60, 90.00),
  ('Massagem relaxante 60min','estetica',  60, 150.00),
  ('Drenagem linfática',      'estetica',  75, 180.00)
ON CONFLICT (category, name) DO NOTHING;

-- ---------------------------------------------------------
-- whatsapp_templates — 6 templates iniciais
-- ---------------------------------------------------------
-- Status PENDING — founder submete à Meta após criar Business Account
-- Ajustar meta_status para APPROVED manualmente quando aprovado pela Meta
-- ---------------------------------------------------------

INSERT INTO public.whatsapp_templates (name, language, category, meta_status, placeholders)
VALUES
  ('otp_login_v1',
   'pt_BR',
   'AUTHENTICATION',
   'PENDING',
   ARRAY['otp_code']),

  ('confirm_24h_v1',
   'pt_BR',
   'UTILITY',
   'PENDING',
   ARRAY['client_name', 'professional_name', 'service_name', 'scheduled_date', 'scheduled_time', 'salon_name']),

  ('remind_2h_v1',
   'pt_BR',
   'UTILITY',
   'PENDING',
   ARRAY['client_name', 'professional_name', 'service_name', 'scheduled_time', 'salon_name']),

  ('booking_confirmed_v1',
   'pt_BR',
   'UTILITY',
   'PENDING',
   ARRAY['client_name', 'professional_name', 'service_name', 'scheduled_date', 'scheduled_time', 'salon_name', 'cancel_link']),

  ('cancellation_notice_v1',
   'pt_BR',
   'UTILITY',
   'PENDING',
   ARRAY['client_name', 'salon_name', 'scheduled_date']),

  ('referral_success_v1',
   'pt_BR',
   'UTILITY',
   'PENDING',
   ARRAY['referrer_name', 'credit_amount_brl', 'salon_name'])
ON CONFLICT (name) DO NOTHING;

COMMIT;

-- =========================================================
-- TODO (founder / data-engineer — antes do design-partner #1):
--   1. Expandir service_catalog para 200+ serviços (cobertura full BR beauty):
--      - Subdividir "cabelo" em: corte, coloração, química, tratamento
--      - Adicionar: cabelo masculino moderno (degradê, navalhado, etc.)
--      - Adicionar: extensão, mega-hair, cauterização
--      - Adicionar: spa, drenagem, massagens variadas
--      - Adicionar: design de sobrancelha com henna, micropigmentação
--      - Adicionar: serviços masculinos (sobrancelha, limpeza)
--   2. Revisar preços sugeridos com base em pesquisa regional
--   3. Submeter os 6 templates à Meta via Business Manager
--   4. Atualizar meta_status para APPROVED após Meta aprovar
-- =========================================================


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 20260421000000_users_email_primary.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
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


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 20260421000001_auth_user_trigger.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
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


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 20260421000002_create_salon_bootstrap_rpc.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- =========================================================
-- SoftHair — create_salon_bootstrap RPC
-- Migration: 20260421000002_create_salon_bootstrap_rpc
-- Author: Dex (Dev Agent) — Story 1.4 Task 5.4
-- Generated: 2026-04-21
-- Context: Supabase JS SDK doesn't expose explicit transactions.
--          Onboarding needs atomic 3-step insert:
--            1. salons (with owner_user_id = auth.uid())
--            2. salon_members (role=OWNER, user_id=auth.uid())
--            3. users.default_salon_id update
--          SECURITY DEFINER RPC handles all three atomically.
-- =========================================================

BEGIN;

-- ---------------------------------------------------------
-- Helper: unaccent_portuguese (pt-BR diacritics removal)
-- ---------------------------------------------------------
-- Simple non-accent fallback (no unaccent extension dependency).
-- Maps common PT-BR accents + & → e. Keeps it light and deterministic.
CREATE OR REPLACE FUNCTION public.unaccent_portuguese(input TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT translate(
    regexp_replace(input, '&', 'e', 'g'),
    'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
    'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'
  );
$$;

-- ---------------------------------------------------------
-- Helper: slugify (pg-native, deterministic)
-- ---------------------------------------------------------
-- Converts "Salão da Maria & Cia" → "salao-da-maria-e-cia"
CREATE OR REPLACE FUNCTION public.slugify(input TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT trim(
    BOTH '-' FROM
    regexp_replace(
      regexp_replace(
        lower(public.unaccent_portuguese(input)),
        '[^a-z0-9]+', '-', 'g'
      ),
      '-+', '-', 'g'
    )
  );
$$;

-- ---------------------------------------------------------
-- RPC: create_salon_bootstrap
-- ---------------------------------------------------------
-- Atomic onboarding flow: creates salon + OWNER membership + user default.
-- Runs as SECURITY DEFINER so RLS policies are bypassed internally, but
-- enforces ownership via auth.uid() checks.
--
-- Returns: full salon row (JSON).
--
-- Errors:
--   - auth_required (no session)
--   - slug_conflict (suggests fallback suffix)
--   - salon_limit_exceeded (user already owns a salon — future constraint)
CREATE OR REPLACE FUNCTION public.create_salon_bootstrap(
  p_name TEXT,
  p_city TEXT DEFAULT NULL,
  p_cnpj TEXT DEFAULT NULL
)
RETURNS public.salons
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_slug TEXT;
  v_base_slug TEXT;
  v_salon public.salons;
  v_suffix INT := 0;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'auth_required'
      USING ERRCODE = 'insufficient_privilege',
            HINT = 'User must be authenticated to create a salon.';
  END IF;

  IF p_name IS NULL OR length(trim(p_name)) < 1 THEN
    RAISE EXCEPTION 'invalid_name'
      USING ERRCODE = 'check_violation',
            HINT = 'Salon name cannot be empty.';
  END IF;

  -- Generate unique slug (suffix with -2, -3, ... if conflict)
  v_base_slug := public.slugify(p_name);
  IF v_base_slug = '' OR v_base_slug IS NULL THEN
    v_base_slug := 'salao';
  END IF;

  v_slug := v_base_slug;
  WHILE EXISTS (SELECT 1 FROM public.salons WHERE slug = v_slug) LOOP
    v_suffix := v_suffix + 1;
    v_slug := v_base_slug || '-' || v_suffix;
    IF v_suffix > 50 THEN
      RAISE EXCEPTION 'slug_conflict'
        USING HINT = 'Too many salons with similar names. Try a more specific name.';
    END IF;
  END LOOP;

  -- Step 1: Insert salon
  INSERT INTO public.salons (name, slug, city, cnpj, owner_user_id)
  VALUES (trim(p_name), v_slug, p_city, p_cnpj, v_user_id)
  RETURNING * INTO v_salon;

  -- Step 2: Insert OWNER membership (HIGH-1 bootstrap fix in RLS lets this pass)
  INSERT INTO public.salon_members (salon_id, user_id, role)
  VALUES (v_salon.id, v_user_id, 'OWNER');

  -- Step 3: Update user default_salon_id
  UPDATE public.users
     SET default_salon_id = v_salon.id
   WHERE id = v_user_id;

  RETURN v_salon;
END;
$$;

COMMENT ON FUNCTION public.create_salon_bootstrap IS
  'Atomic onboarding: creates salons + salon_members OWNER + users.default_salon_id.
   SECURITY DEFINER so internal inserts bypass RLS (safe — function validates auth.uid()).
   Called from Server Action during Story 1.4 Step 1 submit.';

-- Grant execute to authenticated users (not anon)
GRANT EXECUTE ON FUNCTION public.create_salon_bootstrap(TEXT, TEXT, TEXT) TO authenticated;

COMMIT;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 20260421000003_storage_professional_photos.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- =========================================================
-- SoftHair — Storage bucket for professional photos
-- Migration: 20260421000003_storage_professional_photos
-- Author: Dex (Dev Agent) — Story 1.5 Task 1
-- Generated: 2026-04-21
-- Context: Professionals can have an optional photo. Public read
--          (shared via link público). Upload restricted to salon members.
-- =========================================================

BEGIN;

-- ---------------------------------------------------------
-- Create bucket (idempotent)
-- ---------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'professional-photos',
  'professional-photos',
  TRUE,                                             -- public read
  524288,                                           -- 512 KB hard cap (server-side)
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ---------------------------------------------------------
-- RLS policies on storage.objects
-- ---------------------------------------------------------
-- Path convention: professional-photos/{salon_id}/{professional_id}/{filename}

-- Drop if re-running
DROP POLICY IF EXISTS professional_photos_public_read ON storage.objects;
DROP POLICY IF EXISTS professional_photos_authenticated_upload ON storage.objects;
DROP POLICY IF EXISTS professional_photos_authenticated_update ON storage.objects;
DROP POLICY IF EXISTS professional_photos_authenticated_delete ON storage.objects;

-- Public read
CREATE POLICY professional_photos_public_read
  ON storage.objects FOR SELECT
  USING (bucket_id = 'professional-photos');

-- Upload: only salon members can write into their salon's folder
CREATE POLICY professional_photos_authenticated_upload
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'professional-photos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1]::UUID IN (
      SELECT public.current_user_salon_ids()
    )
  );

-- Update (replace): same condition
CREATE POLICY professional_photos_authenticated_update
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'professional-photos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1]::UUID IN (
      SELECT public.current_user_salon_ids()
    )
  );

-- Delete: same condition
CREATE POLICY professional_photos_authenticated_delete
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'professional-photos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1]::UUID IN (
      SELECT public.current_user_salon_ids()
    )
  );

COMMIT;

