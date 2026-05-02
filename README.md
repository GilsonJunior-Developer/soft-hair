# SoftHair

SaaS de gestão para salões de beleza brasileiros pequeno-médios (2-10 profissionais) — construído com AIOX.

> **Status:** MVP em construção. Story 1.1 (scaffold) — Ready for Review.
> **Links:** [Brief](./docs/brief.md) · [PRD](./docs/prd.md) · [Architecture](./docs/architecture.md) · [Front-end Spec](./docs/front-end-spec.md) · [Competitor Analysis](./docs/competitor-analysis.md)

## Quick start (local dev)

Pré-requisitos: **Node 22+**, **pnpm 9+** (ou Corepack habilitado), **Supabase CLI** (opcional neste estágio — necessário na Story 1.2).

```bash
# 1. Clone + install
git clone https://github.com/GilsonJunior-Developer/soft-hair.git
cd soft-hair
pnpm install

# 2. Copie variáveis de ambiente
cp .env.example .env.local
# Preencha (mínimo pra dev): NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY

# 3. Rode em dev
pnpm dev
# Abre http://localhost:3000

# 4. Verifique health check
curl http://localhost:3000/api/healthz
# { "status": "ok", "version": "0.1.0", "timestamp": "..." }
```

## Estrutura do monorepo

```
soft-hair/
├── apps/
│   └── web/            # Next.js 15 app (App Router + RSC + Server Actions)
├── packages/
│   └── db/             # Supabase schema + migrations + RLS
├── docs/               # Planning artifacts (brief, PRD, architecture, FE spec, stories)
├── .github/
│   ├── workflows/      # CI (lint + test + build + e2e)
│   └── ISSUE_TEMPLATE/ # Bug + feature templates
├── .aiox-core/         # AIOX framework (agents, tasks, templates)
└── turbo.json          # Monorepo pipeline
```

## Scripts principais

| Comando | Efeito |
|---|---|
| `pnpm dev` | Dev server com HMR (apps/web) |
| `pnpm build` | Build de produção |
| `pnpm lint` | ESLint em todo o workspace |
| `pnpm typecheck` | TypeScript strict check |
| `pnpm test` | Vitest (unit + integration) |
| `pnpm test:e2e` | Playwright + axe-core (Chromium + Webkit) — see [docs/testing/e2e.md](./docs/testing/e2e.md) |
| `pnpm format` | Prettier em `**/*.{ts,tsx,md,yaml,json}` |

## Stack (do [architecture.md](./docs/architecture.md))

- **Frontend:** Next.js 15 (App Router + RSC + Server Actions) · TypeScript 5.6+ · Tailwind v4 · shadcn/ui · Lucide React
- **Backend:** Server Actions do Next.js + Supabase (Postgres 15 + Auth + Storage + Realtime)
- **Messaging:** Chatwoot self-hosted + WhatsApp Business API (Meta Cloud direto — ADR-0001)
- **Jobs:** Inngest (serverless event-driven)
- **NFS-e:** Nuvem Fiscal (ADR-0002)
- **Tests:** Vitest (unit) + Playwright (e2e)
- **Build:** Turborepo 2.x + pnpm 9.x
- **Host:** Vercel (web) · Railway (Chatwoot) · Inngest · Supabase Cloud

## Fluxo de desenvolvimento

Esse projeto usa **AIOX** — time de agentes AI especializados (Analyst, PM, Architect, UX, Data Engineer, DevOps, SM, PO, Dev, QA). Cada story em `docs/stories/` segue o ciclo:

1. **@sm** cria story (Draft)
2. **@po** valida (10-point checklist) → Ready
3. **@dev** implementa em feature branch → Ready for Review
4. **@qa** valida (7 quality checks) → PASS/CONCERNS/FAIL
5. **@devops** cria PR, CI roda, squash merge → Done

Branch protection em `main` garante: PRs obrigatórios, CI verde, histórico linear, no force push.

## Licença

Proprietário (sem license pública no momento). © 2026 Gilson Junior.
