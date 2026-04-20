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
