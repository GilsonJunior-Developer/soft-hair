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
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- fuzzy search em clients.name

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
  phone_e164 CITEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email CITEXT,
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  phone_e164 CITEXT NOT NULL,
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE RESTRICT,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
  ends_at TIMESTAMPTZ GENERATED ALWAYS AS (scheduled_at + (duration_minutes || ' minutes')::interval) STORED,
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
