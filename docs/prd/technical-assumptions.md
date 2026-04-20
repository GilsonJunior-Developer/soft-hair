# Technical Assumptions

## Repository Structure: Monorepo

Monorepo gerenciado via **Turborepo**. Apps e packages:
- `apps/web` — Next.js 15 (App Router, RSC) — app principal
- `apps/workers` — jobs agendados (confirmações, lembretes, retries NFS-e)
- `packages/ui` — componentes shadcn/ui customizados
- `packages/db` — schema Supabase + migrations + types gerados
- `packages/messaging` — abstração sobre Chatwoot + BSP WhatsApp
- `docs/` — documentação (PRD, architecture, stories)

**Rationale:** facilita compartilhamento de types TypeScript entre web e workers; simplifica CI/CD; reduz overhead para founder solo.

## Service Architecture

**Monolito modular dentro do Next.js** para o MVP. Serviços separados apenas onde o desacoplamento é necessário por natureza:
- **Chatwoot self-hosted** (container separado em Railway/Fly.io) — camada de orquestração de mensagens
- **Worker de mensagens** (job runner via Inngest ou Trigger.dev) — agenda e dispara confirmações/lembretes
- **Integração NFS-e** (chamada síncrona via Server Action ao parceiro; retry assíncrono via worker)

**Evitar microserviços prematuros.** Complexidade adicional não justificada para founder solo + 20 design-partners.

**Rationale:** Next.js 15 com Server Actions + RSC entrega a maior parte das necessidades do MVP (UI + API + lógica de negócio); isolar Chatwoot é necessário porque é produto open-source independente com seu próprio ciclo.

## Testing Requirements

**Unit + Integration** (não full pyramid no MVP):
- **Unit:** Vitest para lógica de negócio crítica (cálculo de comissão, aplicação de crédito de indicação, geração de link público, resolução de conflitos de agenda)
- **Integration:** Playwright para fluxos críticos end-to-end (onboarding completo, agendamento via link público, ciclo de confirmação WhatsApp, emissão NFS-e)
- **Manual:** checklist de smoke test executado antes de cada deploy em produção até o design-partner #10
- **E2E contra produção-like:** ambiente staging com Supabase separado + mock do BSP WhatsApp + mock do parceiro NFS-e para testar fluxos sem custo real

**Rationale:** unit tests protegem regressões nas regras críticas de dinheiro (comissão, crédito); integration tests protegem fluxos de usuário que geram receita; full pyramid (component + visual regression) não se paga no MVP com 1 dev.

## Additional Technical Assumptions and Requests

- **Frontend stack:** Next.js 15 (App Router, RSC, Server Actions), TypeScript estrito, Tailwind CSS v4, shadcn/ui
- **Backend:** Server Actions do Next.js para maioria das operações; edge functions Supabase apenas onde latência global justificar
- **Database:** Supabase (PostgreSQL 15+) com Row-Level Security (RLS) para multi-tenancy; migrations versionadas em `packages/db`
- **Auth:** Supabase Auth customizado para magic link via WhatsApp (implementação de OTP pré-compartilhada com cliente via BSP + validação customizada)
- **Hosting:** Vercel (web), Railway ou Fly.io (Chatwoot + workers), Supabase Cloud (DB + Auth + Storage)
- **Messaging:** WhatsApp Business API oficial via 360dialog ou Meta Cloud API direto (decisão pendente) + Chatwoot self-hosted como orquestrador
- **Queue/Jobs:** Inngest ou Trigger.dev para agendar confirmações/lembretes + retries NFS-e
- **NFS-e:** Nuvem Fiscal ou Focus NFe (decisão pendente com avaliação de custo + cobertura de municípios)
- **Payments:** Stripe, Stone Link ou Asaas para cobrança da assinatura SaaS (não para pagamento de atendimento — cliente final paga no salão via POS existente)
- **Observability:** Sentry (erros) + Vercel Analytics + Supabase logs; PostHog para product analytics (opcional)
- **CI/CD:** GitHub Actions — lint + test + typecheck em cada PR; deploy automático ao main
- **Infra-as-code:** Vercel + Supabase via dashboards + Terraform para componentes Railway/Fly.io (quando houver tempo)
- **Secrets:** Vercel Environment Variables + Supabase Vault para chaves sensíveis
- **LGPD:** Política de privacidade publicada pré-design-partner #1; mecanismo de exclusão de dados automatizado (request via painel do cliente final)

---
