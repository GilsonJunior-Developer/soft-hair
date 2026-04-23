# Epic 1 — Foundation & Salon Onboarding

**Status:** ✅ Complete (2026-04-23) — 7/7 active stories Done + 1 deferida (Story 1.8 SMTP custom, formalmente em Backlog por decisão do Founder)
**Epic Goal:** Estabelecer a base técnica do produto (Next.js + Supabase + CI/CD) e entregar o primeiro fluxo completo de valor: o dono do salão cria sua conta, configura o salão, customiza serviços a partir do catálogo pronto, cadastra o primeiro profissional e chega a uma tela funcional de agenda (ainda vazia, pronta para Epic 2). Ao final do epic, o projeto está deployável em produção e temos um health-check operacional.

## Story Status Summary

| Story | Title | Status | Gate | PR |
|---|---|---|---|---|
| 1.1 | Project Scaffolding & CI/CD Foundation | ✅ Done | — | #2 |
| 1.2 | Data Model Foundation & RLS Policies | ✅ Done | — | #8 |
| 1.3 | Email + Password Authentication | ✅ Done | — | #12 |
| 1.4 | Salon Signup & Onboarding Wizard | ✅ Done | — | #8 |
| 1.5 | Professional Profile Setup | ✅ Done | CONCERNS (2026-04-23) | #8 |
| 1.6 | Service Catalog Customization | ✅ Done | CONCERNS (2026-04-23) | #8 |
| 1.7 | Empty Dashboard "Hoje" | ✅ Done | CONCERNS (2026-04-23) | #9, #11 |
| 1.8 | Custom SMTP for Transactional Email | 🗄️ Backlog (deferred) | — | — |

**Tech debt consolidado:** `docs/qa/backlog.md` (14 itens: 1 done + 12 open + 1 escalado para @devops / Lighthouse CI).

## Story 1.1: Project Scaffolding & CI/CD Foundation

Como **founder/dev**, quero **o projeto Next.js + Supabase + Turborepo bootstrap e com CI/CD funcional**, para que **todo desenvolvimento subsequente rode em infraestrutura confiável desde o dia 1**.

### Acceptance Criteria

1. Monorepo Turborepo criado com `apps/web`, `packages/db`, `packages/ui`, `docs/`
2. `apps/web` inicializado com Next.js 15 (App Router + RSC), TypeScript estrito, Tailwind v4, shadcn/ui instalado
3. Supabase projeto provisionado (dev + staging + prod separados) com CLI configurada localmente
4. GitHub Actions configurado: lint (ESLint), typecheck (tsc), test (Vitest) em cada PR
5. Deploy automático para Vercel ao merge em main (preview deploys em PRs)
6. Rota `/healthz` retorna `{ status: "ok", version: string, timestamp }` — health-check canary
7. README documenta setup local (≤ 5 comandos do clone ao `pnpm dev`)
8. `.env.example` listando todas as variáveis necessárias

## Story 1.2: Data Model Foundation & RLS Policies

Como **founder/dev**, quero **o modelo de dados core (salão, usuário, profissional, serviço, cliente, agendamento) com RLS configurada**, para que **multi-tenancy seja garantida a nível de banco desde o início**.

### Acceptance Criteria

1. Schema Supabase criado com tabelas: `salons`, `users`, `professionals`, `services`, `clients`, `appointments`, `service_catalog` (catálogo global padrão)
2. Todas as tabelas de domínio têm coluna `salon_id` (UUID, FK, NOT NULL)
3. RLS policies ativadas: usuário só lê/escreve linhas do seu `salon_id`
4. Policy explicita acesso ao `service_catalog` global (read-only público)
5. Migrations versionadas em `packages/db/migrations/`
6. Types TypeScript gerados automaticamente via Supabase CLI (`packages/db/types`)
7. Testes de RLS: unit test validando que usuário de salão A não acessa dados de salão B
8. Seed SQL com 200+ serviços padrão populando `service_catalog`

## Story 1.3: Email + Password Authentication (with magic link recovery)

Como **dono do salão**, quero **fazer login com email e senha, com opção de recuperar senha via link enviado por email**, para que **o acesso diário seja rápido e eu não perca acesso ao salão se esquecer a senha**.

### Acceptance Criteria

1. Tela de login aceita email + senha
2. Ao submeter, autenticação via `supabase.auth.signInWithPassword`
3. Sessão expira após 30 dias de inatividade (auto-refresh < 24h)
4. Rate limit de autenticação: seguir defaults do Supabase
5. Logout limpa sessão e redireciona para tela de login
6. Fluxo "Esqueci minha senha" envia magic link via email (`supabase.auth.resetPasswordForEmail`) que rota via `/auth/callback` → `/auth/nova-senha`
7. Mensagens de erro genéricas (não revelar existência de email)
8. Schema: `public.users.email` NOT NULL UNIQUE; `phone_e164` NULLABLE (Phase 2)
9. Trigger `on_auth_user_created` popula `public.users` automaticamente
10. Full flow passa E2E (Playwright): login, logout, reset password, nova senha

## Story 1.4: Salon Signup & Onboarding Wizard

Como **novo dono de salão**, quero **um wizard de cadastro rápido (≤ 10 min)**, para que **eu comece a usar o SoftHair sem configurar tudo do zero**.

### Acceptance Criteria

1. Wizard em 3 passos: (a) dados do salão (nome, cidade, CNPJ opcional); (b) seleção de categorias de serviço (cabelo, unha, barbearia, estética) — filtra catálogo padrão; (c) preços dos 10 serviços mais comuns por categoria selecionada
2. Catálogo pré-populado: ao selecionar categoria, sistema pré-adiciona serviços padrão com preços sugeridos (editáveis)
3. Barra de progresso mostra 1/3, 2/3, 3/3
4. Botão "Pular e configurar depois" em cada passo (permite setup mínimo com apenas nome do salão)
5. Ao completar, usuário é redirecionado para Dashboard "Hoje" (mesmo que vazio)
6. Dados persistem corretamente em `salons`, `services` e relações
7. Passa teste E2E de onboarding completo em ≤ 10 min

## Story 1.5: Professional Profile Setup

Como **dono do salão**, quero **cadastrar profissionais com nome, comissão e disponibilidade**, para que **agendamentos possam ser atribuídos a eles**.

### Acceptance Criteria

1. Tela "Profissionais" listando profissionais cadastrados (vazia no início, com CTA "Adicionar profissional")
2. Formulário de cadastro: nome, foto opcional (upload para Supabase Storage), especialidades (multi-select do catálogo), horário de trabalho (dias + janelas), regra de comissão (% fixa OU tabela por serviço)
3. Edição e remoção (soft delete) suportadas
4. Profissional inativo não aparece na agenda pública
5. Salão pode ter 1-20 profissionais (validação de limite)
6. Foto redimensionada automaticamente para ≤ 500KB
7. Passa teste E2E de CRUD de profissional

## Story 1.6: Service Catalog Customization

Como **dono do salão**, quero **customizar o catálogo de serviços (adicionar, remover, ajustar preço e duração)**, para que **o salão reflita sua realidade operacional**.

### Acceptance Criteria

1. Tela "Serviços" lista todos os serviços customizados do salão (seed do onboarding pré-carregado)
2. Adicionar serviço: a partir do catálogo global (`service_catalog`) OU criação custom
3. Cada serviço tem: nome, categoria, preço (R$), duração (minutos, múltiplos de 15), comissão customizada (opcional, sobrescreve default do profissional)
4. Ativar/desativar serviço (serviço inativo não aparece no link público)
5. Busca + filtro por categoria
6. Passa teste E2E de CRUD de serviço

## Story 1.7: Empty Dashboard "Hoje"

Como **dono do salão**, quero **ver uma tela inicial clara mostrando o que acontecerá hoje**, para que **eu tenha contexto imediato ao abrir o sistema**.

### Acceptance Criteria

1. Dashboard exibe: data de hoje, próximos 3 agendamentos (vazio neste momento, placeholder friendly "Nenhum agendamento hoje ainda"), 3 métricas placeholder (agendamentos hoje, faturamento do dia, taxa de ocupação — todos zerados)
2. Header com logo, nome do salão, avatar do usuário + menu logout
3. Navegação lateral (desktop) ou bottom-nav (mobile) com: Hoje, Agenda, Profissionais, Serviços, Clientes (placeholder), Financeiro (placeholder), Configurações
4. Responsive mobile-first: layout adapta em ≤ 375px
5. PWA manifest configurado (installable)
6. Acessibilidade: navegação por teclado + ARIA labels validados com axe-core
7. Passa teste E2E de renderização em Chrome + Safari iOS (via Playwright)

## Story 1.8: Custom SMTP for Transactional Email

Como **dono do salão**, quero **receber emails de recuperação de senha e notificações com alta confiabilidade (≥ 95% inbox em Gmail/Outlook)**, para que **eu não perca acesso à plataforma e clientes recebam confirmações de agendamento**.

### Acceptance Criteria

1. Conta Resend criada, domínio `<dominio-softhair>` verificado via DNS (SPF/DKIM/DMARC passam em mxtoolbox.com)
2. SMTP custom aplicado em `softhair-dev` via Management API (patch `mailer.secure_password_change`, `smtp_*` via script)
3. SMTP custom aplicado em `softhair-prod` via mesma API
4. Script `scripts/supabase-auth-setup.ts` atualizado para incluir campos `smtp_host`, `smtp_port`, `smtp_user`, `smtp_pass`, `smtp_sender_email`, `smtp_sender_name`, `smtp_max_frequency`
5. Secrets (Resend API key) armazenados fora do repo (Vercel env vars OR Supabase Vault); rotação documentada
6. Smoke test em dev: enviar reset password para conta de teste, confirmar chegada em Gmail (inbox, não spam) em ≤ 2 min
7. Smoke test em prod (pós-apply): idem, com Founder validando recebimento real
8. Change Log de `softhair-prod` registrado em `docs/ops/prod-smtp-config-<data>.md`

---
