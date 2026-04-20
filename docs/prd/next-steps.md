# Next Steps

## UX Expert Prompt

@ux-design-expert, este PRD (`docs/prd.md` v1.0) define SoftHair — SaaS de gestão para salões de beleza BR com foco em mobile-first PWA, WCAG AA, e anti-fricção radical. Por favor, inicie em **'Front-End Spec Generation Mode'** e crie o `docs/front-end-spec.md` detalhando: wireframes por tela (13 core screens listados na seção UI Design Goals), sistema de design tokens (paleta, tipografia, spacing), especificação dos 2 fluxos críticos E2E (onboarding salão + self-booking cliente), e mockups prioritários para Epic 1 + Epic 2. Branding assumido: rosa nude + off-white + preto suave + dourado accent (a validar com founder).

## Architect Prompt

@architect (Aria), este PRD (`docs/prd.md` v1.0) define stack e constraints de SoftHair. Decisões técnicas principais já declaradas nas Technical Assumptions: Next.js 15 + Supabase + Chatwoot self-hosted + WhatsApp Business API oficial (via 360dialog ou Meta Cloud — ADR pendente) + Nuvem Fiscal/Focus NFe (ADR pendente). Por favor, inicie em **'Architecture Mode'** e crie `docs/architecture.md` cobrindo: diagrama de contexto + containers (C4), modelo de dados detalhado (expansão das tabelas listadas em Story 1.2), arquitetura de filas/jobs (Inngest vs Trigger.dev — escolher), padrão multi-tenant com RLS, estratégia de deploy (Vercel + Railway + Supabase), observabilidade (Sentry + PostHog + Vercel Analytics), e os 2 ADRs pendentes (WhatsApp BSP + NFS-e partner). Delegue a `@data-engineer` (Dara) o DDL completo de RLS e migrations.
