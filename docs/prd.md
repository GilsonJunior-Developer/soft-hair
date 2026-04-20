# SoftHair Product Requirements Document (PRD)

**Versão:** 1.0 (DRAFT — aguardando review)
**Data:** 2026-04-20
**Autor:** Morgan (PM Agent)
**Status:** Draft para review do founder
**Input:** `docs/brief.md` v1.0 + `docs/competitor-analysis.md`

---

## Goals and Background Context

### Goals

- Entregar MVP operacional em 3 meses (até 2026-07-20) validado com 20 salões design-partners em uso contínuo por 60+ dias
- Atingir NPS >= 50 entre os 20 design-partners e reduzir no-show médio em >= 30%
- Provar thesis de bundling: 100% dos design-partners ativando WhatsApp + comissão + NFS-e no plano base
- Viabilizar >= 50% dos agendamentos via link público (self-service) sem app nativo do cliente final
- Ativar loop de crescimento orgânico via indicação C2C com crédito automático (diferencial único no mercado BR)
- Estabelecer base técnica para escalar para 100 salões pagantes em 12 meses sem refatoração estrutural
- Garantir compliance LGPD + WhatsApp ToS desde o design-partner #1 (zero risco de ban do número do salão)

### Background Context

SoftHair endereça a fricção operacional de salões brasileiros pequeno-médios (2-10 profissionais), que hoje operam com um mosaico de ferramentas (caderno, WhatsApp manual, Excel) consumindo 5-10 horas semanais da recepção e gerando no-show de 15-25%. Os incumbentes (Trinks e Avec) dominam o mercado mas têm vulnerabilidades estruturais: Trinks cobra NFS-e como add-on (reclamações recorrentes) e Avec aplica gating agressivo — salões 1-5 pros ficam sem features críticas (estoque, comissão, WhatsApp, NFS-e) até saltarem para tier R$ 369+.

O SoftHair explora três oportunidades simultâneas: (1) sweet spot desatendido de 3-5 pros, (2) whitespaces técnicos (indicação C2C automática, voice booking futuro, rentabilidade granular), e (3) janela de 12-18 meses antes de Booksy/Fresha consolidarem presença BR. A arquitetura web-only (PWA) + WhatsApp Business API oficial via Chatwoot + stack AIOX permite execução lean por founder solo em 3 meses.

### Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-04-20 | 1.0 | Draft inicial criado a partir do Project Brief v1.0 | Morgan (PM) |

---

## Requirements

### Functional

- **FR1:** O sistema deve permitir cadastro de salão em fluxo único com ≤ 5 campos obrigatórios (nome do salão, cidade, telefone do dono, e-mail, senha via magic link WhatsApp).
- **FR2:** O sistema deve pré-popular o catálogo de serviços do salão com ≥ 200 serviços padrão do setor (cabelo, unha, barbearia, estética), permitindo ao dono customizar preço, duração e disponibilidade sem ter que criar serviços do zero.
- **FR3:** O sistema deve suportar cadastro de profissional com perfil individual (nome, especialidades, foto opcional, horários disponíveis, percentual de comissão ou tabela por serviço).
- **FR4:** O sistema deve oferecer uma agenda visual (dia/semana/mês) por profissional e consolidada por salão, com drag-and-drop para reagendamento e bloqueio manual de horários.
- **FR5:** O sistema deve gerar um link público único por profissional (formato `softhair.com.br/{salao}/{profissional}`), compartilhável no Instagram bio e WhatsApp status.
- **FR6:** O cliente final deve conseguir agendar pelo link público fornecendo apenas número de WhatsApp + selecionando serviço e horário, sem necessidade de login ou app nativo.
- **FR7:** O sistema deve manter histórico do cliente (serviços anteriores, profissional, data, observações do atendimento) recuperável por telefone.
- **FR8:** O sistema deve enviar confirmação automática via WhatsApp Business API oficial 24h antes do agendamento, usando template utility pré-aprovado pela Meta.
- **FR9:** O sistema deve enviar lembrete automático via WhatsApp 2h antes do agendamento, com template utility distinto do de confirmação.
- **FR10:** O sistema deve atualizar automaticamente o status do agendamento com base na resposta do cliente ao template WhatsApp (CONFIRMADO, CANCELADO, SEM RESPOSTA).
- **FR11:** O sistema deve calcular comissão automaticamente por profissional ao final de cada atendimento, aplicando regras configuráveis (% fixa ou tabela por serviço).
- **FR12:** O sistema deve gerar relatório mensal de comissão por profissional, exportável em PDF/CSV, pronto para pagamento.
- **FR13:** O sistema deve emitir NFS-e pós-atendimento em 1 clique via integração com parceiro externo (Nuvem Fiscal ou Focus NFe), suportando inicialmente ≥ 5 municípios prioritários.
- **FR14:** O sistema deve implementar retry automático em caso de falha de emissão NFS-e, com notificação ao dono do salão se falhar após 3 tentativas.
- **FR15:** O sistema deve exibir dashboard financeiro básico com faturamento do dia/semana/mês, receita por profissional e comissão a pagar no período.
- **FR16:** O sistema deve gerar um link único de indicação por cliente, compartilhável em WhatsApp/Instagram.
- **FR17:** Quando uma nova cliente agenda pela primeira vez via link de indicação, o sistema deve registrar a indicação e atribuir crédito configurável (R$ em valor absoluto ou % do serviço) à cliente indicadora.
- **FR18:** O sistema deve aplicar automaticamente o crédito acumulado da indicadora no próximo agendamento dela, sem necessidade de input manual do salão.
- **FR19:** O sistema deve permitir autenticação do dono/recepcionista via magic link enviado por WhatsApp (sem senha tradicional).
- **FR20:** O sistema deve suportar múltiplos usuários por salão com papéis distintos (Dono, Recepcionista, Profissional) e permissões diferenciadas.
- **FR21:** O cliente final deve conseguir cancelar ou reagendar seu agendamento via link único recebido por WhatsApp, dentro da janela permitida pelo salão (configurável, default 24h).
- **FR22:** O sistema deve permitir ao salão configurar janelas de horário de funcionamento, intervalos (almoço), e bloqueios recorrentes (folga semanal de cada profissional).

### Non Functional

- **NFR1:** A aplicação deve ser PWA web-responsive com suporte a Chrome/Edge/Safari/Firefox (últimas 2 versões), Android 10+ e iOS 15+ (Safari).
- **NFR2:** Time to Interactive (TTI) deve ser ≤ 3 segundos em conexão 4G para páginas públicas (link de agendamento) e ≤ 4s para dashboard do salão.
- **NFR3:** A criação de agendamento (end-to-end) deve completar em ≤ 500ms (servidor) em condições normais.
- **NFR4:** O sistema deve estar em conformidade com LGPD: consentimento explícito no cadastro do cliente final, direito de exclusão de dados, política de privacidade clara pré-disponibilizada.
- **NFR5:** Multi-tenancy deve ser implementada via Row-Level Security (RLS) no Supabase, garantindo isolamento completo de dados entre salões a nível de banco.
- **NFR6:** O sistema deve emitir NFS-e com taxa de sucesso ≥ 95% em municípios suportados; falhas devem ser logadas, notificadas e reprocessadas automaticamente.
- **NFR7:** Backup de banco de dados deve ocorrer diariamente com retenção mínima de 30 dias (Point-in-Time Recovery via Supabase).
- **NFR8:** Uso de WhatsApp Business API oficial deve ser 100% compliant com ToS da Meta — nenhuma API não-oficial (Evolution, Baileys, Venom-Bot) pode ser utilizada em qualquer hipótese.
- **NFR9:** Custo médio de mensageria por salão não deve exceder R$ 15/mês na cota base (~500 mensagens/mês), garantindo margem unitária positiva no plano base.
- **NFR10:** A aplicação deve atender WCAG 2.1 AA em todas as telas do dono/recepcionista e no link público de agendamento do cliente final.
- **NFR11:** Infraestrutura mensal total (Vercel + Supabase + Chatwoot host + BSP WhatsApp + Nuvem Fiscal) deve caber em orçamento de R$ 500-1.500/mês durante a fase MVP (até 20 salões).
- **NFR12:** Logs de acesso a dados financeiros (faturamento, comissão, NFS-e) devem ser mantidos com trilha de auditoria (quem, quando, qual salão).
- **NFR13:** O link público de agendamento deve suportar ≥ 100 acessos simultâneos por salão sem degradação (load test como parte do Definition of Done).
- **NFR14:** Emissão de templates WhatsApp deve passar por aprovação prévia da Meta; templates não-aprovados não podem ser enviados em produção.

---

## User Interface Design Goals

### Overall UX Vision

SoftHair é construído sobre o princípio de **anti-fricção radical** — cada clique que pode ser eliminado deve ser eliminado. A interface prioriza mobile-first para todas as superfícies (dono gerencia o salão do celular durante o expediente; cliente final agenda do celular em ≤ 60 segundos). Design deve evocar confiança (salão guarda dados sensíveis financeiros e de clientes) + leveza (setor beauty valoriza estética). Nenhuma tela do MVP pode exigir mais de 3 cliques para ação principal. Feedback visual imediato em todas as operações (toast de sucesso, estado de loading claro, mensagem de erro com ação de recuperação).

### Key Interaction Paradigms

- **Drag-and-drop** na agenda (reagendamento visual em <2s)
- **Swipe actions** no mobile para cancelar/confirmar agendamento rapidamente
- **Long-press** em card de cliente para ver histórico completo sem abrir outra tela
- **Magic link WhatsApp** como padrão de autenticação (não senha)
- **Self-service via link público** para cliente final (zero login, zero cadastro, só telefone no checkout)
- **Toast + inline actions** em vez de modais pesados sempre que possível
- **PWA installable** opcional — salão pode "instalar" ícone na home screen mas não é obrigatório

### Core Screens and Views

**Para o dono/recepcionista do salão (autenticado):**
1. Onboarding Wizard (3 passos, ≤ 10min até primeiro agendamento)
2. Dashboard "Hoje" (tela inicial — próximos agendamentos + status operacional + 3 métricas-chave)
3. Agenda Visual (dia/semana/mês por profissional e consolidada)
4. Tela de Agendamento (criar/editar — vem com cliente, serviço e profissional pré-selecionáveis)
5. Cliente Detalhe (histórico, preferências, agendamentos futuros, crédito de indicação)
6. Gestão de Profissionais (perfil, comissão, disponibilidade)
7. Gestão de Serviços (catálogo customizado, preços, durações)
8. Financeiro (dashboard + fechamento mensal + NFS-e emitidas)
9. Comissão (relatório por profissional + exportação)
10. Configurações (dados do salão, usuários, templates WhatsApp, janela de cancelamento)

**Para o cliente final (público, sem login):**
11. Link público de Agendamento (3 passos: serviço → profissional+horário → telefone → confirmado)
12. Página de Gerenciamento do Agendamento (via link WhatsApp — pode cancelar/reagendar)

**Para o profissional (futuro, Phase 2):**
13. Agenda Individual Simplificada (próximos atendimentos + comissão acumulada)

### Accessibility: WCAG AA

Todas as telas — tanto dashboard do salão quanto link público do cliente — devem atender WCAG 2.1 AA, incluindo:
- Contraste mínimo 4.5:1 para texto regular, 3:1 para texto large
- Navegação completa por teclado em todas as funcionalidades
- Labels semânticos em formulários
- Suporte a screen readers (VoiceOver iOS + TalkBack Android prioritários)
- Respeito a `prefers-reduced-motion`

### Branding

Branding inicial a ser definido (decisão pendente com founder). Premissas iniciais para o design architect:

- **Paleta sugerida:** tons quentes + neutros sofisticados (rosa nude, off-white, preto suave, dourado como accent) — evita clichês de "salão feminino rosa pink" mas mantém conexão com setor beauty
- **Tipografia:** sans-serif moderna + humana (ex. Inter para UI + display serif light para headlines)
- **Iconografia:** outline fino, consistente (ex. Lucide ou Phosphor)
- **Fotografia/ilustração:** autêntica (fotos reais de trabalho de salão, diversidade étnica e etária), evitar stock photos genéricos
- **Tom de voz:** direto, empático, anti-jargão técnico — fala a linguagem da dona do salão, não do desenvolvedor

### Target Device and Platforms: Web Responsive (PWA)

- **Primary:** Mobile web (iOS Safari + Android Chrome) — ≥ 70% do uso esperado
- **Secondary:** Desktop web (Chrome/Edge/Safari) para recepção com computador fixo
- **Not supported in MVP:** Apps nativos iOS/Android (PWA substitui)

---

## Technical Assumptions

### Repository Structure: Monorepo

Monorepo gerenciado via **Turborepo**. Apps e packages:
- `apps/web` — Next.js 15 (App Router, RSC) — app principal
- `apps/workers` — jobs agendados (confirmações, lembretes, retries NFS-e)
- `packages/ui` — componentes shadcn/ui customizados
- `packages/db` — schema Supabase + migrations + types gerados
- `packages/messaging` — abstração sobre Chatwoot + BSP WhatsApp
- `docs/` — documentação (PRD, architecture, stories)

**Rationale:** facilita compartilhamento de types TypeScript entre web e workers; simplifica CI/CD; reduz overhead para founder solo.

### Service Architecture

**Monolito modular dentro do Next.js** para o MVP. Serviços separados apenas onde o desacoplamento é necessário por natureza:
- **Chatwoot self-hosted** (container separado em Railway/Fly.io) — camada de orquestração de mensagens
- **Worker de mensagens** (job runner via Inngest ou Trigger.dev) — agenda e dispara confirmações/lembretes
- **Integração NFS-e** (chamada síncrona via Server Action ao parceiro; retry assíncrono via worker)

**Evitar microserviços prematuros.** Complexidade adicional não justificada para founder solo + 20 design-partners.

**Rationale:** Next.js 15 com Server Actions + RSC entrega a maior parte das necessidades do MVP (UI + API + lógica de negócio); isolar Chatwoot é necessário porque é produto open-source independente com seu próprio ciclo.

### Testing Requirements

**Unit + Integration** (não full pyramid no MVP):
- **Unit:** Vitest para lógica de negócio crítica (cálculo de comissão, aplicação de crédito de indicação, geração de link público, resolução de conflitos de agenda)
- **Integration:** Playwright para fluxos críticos end-to-end (onboarding completo, agendamento via link público, ciclo de confirmação WhatsApp, emissão NFS-e)
- **Manual:** checklist de smoke test executado antes de cada deploy em produção até o design-partner #10
- **E2E contra produção-like:** ambiente staging com Supabase separado + mock do BSP WhatsApp + mock do parceiro NFS-e para testar fluxos sem custo real

**Rationale:** unit tests protegem regressões nas regras críticas de dinheiro (comissão, crédito); integration tests protegem fluxos de usuário que geram receita; full pyramid (component + visual regression) não se paga no MVP com 1 dev.

### Additional Technical Assumptions and Requests

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

## Epic List

Proposta inicial de **5 épicos sequenciais** cobrindo o MVP. Cada epic entrega incremento deployável e testável.

1. **Epic 1 — Foundation & Salon Onboarding:** Estabelecer projeto Next.js + Supabase + CI/CD + auth via magic link WhatsApp, entregando onboarding completo do salão com catálogo pré-populado e primeiro profissional configurado.
2. **Epic 2 — Core Booking Loop:** Habilitar agenda visual, link público de agendamento por profissional, self-booking do cliente final (phone-only) e histórico de cliente — salão já recebe agendamentos reais.
3. **Epic 3 — WhatsApp Messaging Automation:** Integrar Chatwoot + WhatsApp Business API oficial, aprovar templates, automatizar confirmação 24h + lembrete 2h, e atualizar status do agendamento com base na resposta — reduz no-show.
4. **Epic 4 — Finance, Commission & NFS-e:** Implementar cálculo automático de comissão, dashboard financeiro básico e emissão NFS-e integrada via Nuvem Fiscal — salão fecha mês operacional completo.
5. **Epic 5 — Growth Loop: Indicação C2C:** Ativar sistema de indicação cliente→cliente com crédito automático — diferencial competitivo e growth loop orgânico para atrair próximos design-partners.

**Rationale da ordenação:**
- Epic 1 é a fundação obrigatória (infra + auth + primeira interação)
- Epic 2 entrega valor isolado (salão pode receber agendamentos mesmo sem mensageria automática, usando WhatsApp manual no intervalo)
- Epic 3 resolve a dor central do no-show — deployable assim que Epic 2 existir
- Epic 4 viabiliza monetização e compliance fiscal do salão
- Epic 5 é diferencial competitivo (pode ser priorizado antes de Epic 4 se aquisição for crítica, mas por default deixo no fim para garantir que o salão possa operar o financeiro antes de crescer base)

---

## Epic 1 — Foundation & Salon Onboarding

**Epic Goal:** Estabelecer a base técnica do produto (Next.js + Supabase + CI/CD) e entregar o primeiro fluxo completo de valor: o dono do salão cria sua conta, configura o salão, customiza serviços a partir do catálogo pronto, cadastra o primeiro profissional e chega a uma tela funcional de agenda (ainda vazia, pronta para Epic 2). Ao final do epic, o projeto está deployável em produção e temos um health-check operacional.

### Story 1.1: Project Scaffolding & CI/CD Foundation

Como **founder/dev**, quero **o projeto Next.js + Supabase + Turborepo bootstrap e com CI/CD funcional**, para que **todo desenvolvimento subsequente rode em infraestrutura confiável desde o dia 1**.

#### Acceptance Criteria

1. Monorepo Turborepo criado com `apps/web`, `packages/db`, `packages/ui`, `docs/`
2. `apps/web` inicializado com Next.js 15 (App Router + RSC), TypeScript estrito, Tailwind v4, shadcn/ui instalado
3. Supabase projeto provisionado (dev + staging + prod separados) com CLI configurada localmente
4. GitHub Actions configurado: lint (ESLint), typecheck (tsc), test (Vitest) em cada PR
5. Deploy automático para Vercel ao merge em main (preview deploys em PRs)
6. Rota `/healthz` retorna `{ status: "ok", version: string, timestamp }` — health-check canary
7. README documenta setup local (≤ 5 comandos do clone ao `pnpm dev`)
8. `.env.example` listando todas as variáveis necessárias

### Story 1.2: Data Model Foundation & RLS Policies

Como **founder/dev**, quero **o modelo de dados core (salão, usuário, profissional, serviço, cliente, agendamento) com RLS configurada**, para que **multi-tenancy seja garantida a nível de banco desde o início**.

#### Acceptance Criteria

1. Schema Supabase criado com tabelas: `salons`, `users`, `professionals`, `services`, `clients`, `appointments`, `service_catalog` (catálogo global padrão)
2. Todas as tabelas de domínio têm coluna `salon_id` (UUID, FK, NOT NULL)
3. RLS policies ativadas: usuário só lê/escreve linhas do seu `salon_id`
4. Policy explicita acesso ao `service_catalog` global (read-only público)
5. Migrations versionadas em `packages/db/migrations/`
6. Types TypeScript gerados automaticamente via Supabase CLI (`packages/db/types`)
7. Testes de RLS: unit test validando que usuário de salão A não acessa dados de salão B
8. Seed SQL com 200+ serviços padrão populando `service_catalog`

### Story 1.3: Magic Link Authentication via WhatsApp

Como **dono do salão**, quero **fazer login usando apenas meu número de WhatsApp (sem senha)**, para que **o acesso seja simples e sem fricção, alinhado ao comportamento natural do setor**.

#### Acceptance Criteria

1. Tela de login aceita número de WhatsApp (formato BR: +55 DDD 9XXXX-XXXX)
2. Ao submeter, sistema gera OTP de 6 dígitos válido por 10 minutos
3. OTP é enviado via BSP WhatsApp (360dialog ou Meta Cloud API direto) usando template utility aprovado
4. Tela de validação OTP aceita código e retorna sessão válida do Supabase Auth
5. Sessão expira após 30 dias de inatividade
6. Rate limit: máximo 3 solicitações de OTP por número a cada 10 minutos
7. Logout limpa sessão e redireciona para tela de login
8. Fallback claro se BSP falhar (mensagem de erro + "tentar de novo em X segundos")
9. Todo o fluxo passa teste E2E (Playwright) usando mock do BSP

### Story 1.4: Salon Signup & Onboarding Wizard

Como **novo dono de salão**, quero **um wizard de cadastro rápido (≤ 10 min)**, para que **eu comece a usar o SoftHair sem configurar tudo do zero**.

#### Acceptance Criteria

1. Wizard em 3 passos: (a) dados do salão (nome, cidade, CNPJ opcional); (b) seleção de categorias de serviço (cabelo, unha, barbearia, estética) — filtra catálogo padrão; (c) preços dos 10 serviços mais comuns por categoria selecionada
2. Catálogo pré-populado: ao selecionar categoria, sistema pré-adiciona serviços padrão com preços sugeridos (editáveis)
3. Barra de progresso mostra 1/3, 2/3, 3/3
4. Botão "Pular e configurar depois" em cada passo (permite setup mínimo com apenas nome do salão)
5. Ao completar, usuário é redirecionado para Dashboard "Hoje" (mesmo que vazio)
6. Dados persistem corretamente em `salons`, `services` e relações
7. Passa teste E2E de onboarding completo em ≤ 10 min

### Story 1.5: Professional Profile Setup

Como **dono do salão**, quero **cadastrar profissionais com nome, comissão e disponibilidade**, para que **agendamentos possam ser atribuídos a eles**.

#### Acceptance Criteria

1. Tela "Profissionais" listando profissionais cadastrados (vazia no início, com CTA "Adicionar profissional")
2. Formulário de cadastro: nome, foto opcional (upload para Supabase Storage), especialidades (multi-select do catálogo), horário de trabalho (dias + janelas), regra de comissão (% fixa OU tabela por serviço)
3. Edição e remoção (soft delete) suportadas
4. Profissional inativo não aparece na agenda pública
5. Salão pode ter 1-20 profissionais (validação de limite)
6. Foto redimensionada automaticamente para ≤ 500KB
7. Passa teste E2E de CRUD de profissional

### Story 1.6: Service Catalog Customization

Como **dono do salão**, quero **customizar o catálogo de serviços (adicionar, remover, ajustar preço e duração)**, para que **o salão reflita sua realidade operacional**.

#### Acceptance Criteria

1. Tela "Serviços" lista todos os serviços customizados do salão (seed do onboarding pré-carregado)
2. Adicionar serviço: a partir do catálogo global (`service_catalog`) OU criação custom
3. Cada serviço tem: nome, categoria, preço (R$), duração (minutos, múltiplos de 15), comissão customizada (opcional, sobrescreve default do profissional)
4. Ativar/desativar serviço (serviço inativo não aparece no link público)
5. Busca + filtro por categoria
6. Passa teste E2E de CRUD de serviço

### Story 1.7: Empty Dashboard "Hoje"

Como **dono do salão**, quero **ver uma tela inicial clara mostrando o que acontecerá hoje**, para que **eu tenha contexto imediato ao abrir o sistema**.

#### Acceptance Criteria

1. Dashboard exibe: data de hoje, próximos 3 agendamentos (vazio neste momento, placeholder friendly "Nenhum agendamento hoje ainda"), 3 métricas placeholder (agendamentos hoje, faturamento do dia, taxa de ocupação — todos zerados)
2. Header com logo, nome do salão, avatar do usuário + menu logout
3. Navegação lateral (desktop) ou bottom-nav (mobile) com: Hoje, Agenda, Profissionais, Serviços, Clientes (placeholder), Financeiro (placeholder), Configurações
4. Responsive mobile-first: layout adapta em ≤ 375px
5. PWA manifest configurado (installable)
6. Acessibilidade: navegação por teclado + ARIA labels validados com axe-core
7. Passa teste E2E de renderização em Chrome + Safari iOS (via Playwright)

---

## Epic 2 — Core Booking Loop

**Epic Goal:** Habilitar o salão a receber e gerenciar agendamentos de fim a fim. Salão tem agenda visual funcional; cliente final consegue agendar via link público apenas com telefone; histórico do cliente é mantido. Ao fim do epic, os design-partners podem operar (mesmo que a confirmação WhatsApp ainda seja manual — Epic 3 automatiza).

### Story 2.1: Visual Calendar/Agenda View

Como **dono/recepcionista do salão**, quero **ver a agenda visual com filtros por profissional e período**, para que **eu tenha controle operacional do dia**.

#### Acceptance Criteria

1. Visualização em 3 modos: Dia, Semana, Mês — selecionável via toggle
2. Filtro por profissional (all/um específico)
3. Agendamentos renderizados como blocks coloridos na grade de horário
4. Click no bloco abre modal com detalhes + ações (cancelar, reagendar, marcar como atendido)
5. Click em slot vazio abre fluxo de criar agendamento (Story 2.2)
6. Indicador visual de horário atual ("linha vermelha") no dia corrente
7. Navegação entre dias/semanas/meses via botões + (opcional) gesture swipe no mobile
8. Performance: renderiza semana com 100 agendamentos em ≤ 500ms

### Story 2.2: Manual Appointment Creation (by Salon Staff)

Como **recepcionista**, quero **criar um agendamento manualmente quando o cliente liga ou aparece presencialmente**, para que **nenhum agendamento seja perdido**.

#### Acceptance Criteria

1. Botão "+ Novo agendamento" visível em todas as telas de agenda
2. Formulário: cliente (busca por telefone — se existir, carrega; se não, cria novo cliente), serviço (dropdown do catálogo ativo), profissional (dropdown com disponibilidade filtrada), data e hora (picker)
3. Sistema calcula automaticamente horário de término baseado na duração do serviço
4. Validação: não permite conflito de horário com outro agendamento do mesmo profissional
5. Ao confirmar, agendamento aparece imediatamente na agenda (realtime via Supabase Realtime, sem reload)
6. Se o cliente novo, registra em `clients` com telefone como identificador único
7. Passa teste E2E de criação completa

### Story 2.3: Public Booking Link per Professional

Como **dono do salão**, quero **um link público único por profissional compartilhável**, para que **clientes agendem via Instagram/WhatsApp sem fricção**.

#### Acceptance Criteria

1. Cada profissional ativo tem URL canônica `softhair.com.br/{slug-salao}/{slug-profissional}`
2. Slug gerado automaticamente a partir do nome (lowercase, kebab-case, com deduplicação)
3. Tela de Profissionais exibe botão "Copiar link público" que copia para clipboard
4. Link renderiza página pública SSR (SEO-friendly) com: foto do profissional, serviços disponíveis, avaliações (futuro), CTA "Agendar agora"
5. Página carrega em ≤ 2s em 4G (validado via Lighthouse ≥ 90 em Performance)
6. Metadados Open Graph configurados para preview rico em WhatsApp/Instagram
7. Página é WCAG AA compliant

### Story 2.4: Client-Facing Self-Booking Flow

Como **cliente final**, quero **agendar pelo link público informando apenas meu WhatsApp**, para que **o agendamento leve ≤ 60 segundos sem baixar app**.

#### Acceptance Criteria

1. Fluxo em 3 passos: (a) escolher serviço, (b) escolher data+horário disponível, (c) informar nome + WhatsApp → confirmar
2. Passo (b) mostra apenas slots realmente disponíveis (respeita horário de trabalho do profissional, duração do serviço, agendamentos existentes)
3. Validação de telefone BR (formato E.164)
4. Checkbox obrigatório de consentimento LGPD ("Concordo que meus dados sejam usados para confirmar o agendamento e histórico")
5. Ao confirmar, agendamento persiste em `appointments` com status `PENDING_CONFIRMATION`
6. Cliente recebe tela de sucesso com resumo + "instruções do que acontece agora" (confirmação virá por WhatsApp)
7. Fluxo completo passa teste E2E em ≤ 60 segundos (Playwright)
8. Tracking: evento `booking_completed` dispara no analytics

### Story 2.5: Client History & Profile

Como **dono/recepcionista**, quero **ver o histórico de cada cliente**, para que **eu personalize o atendimento (lembrar do que fez antes)**.

#### Acceptance Criteria

1. Tela "Clientes" lista clientes do salão (ordenável por último agendamento, nome, quantidade de visitas)
2. Busca por nome OU telefone
3. Detalhe do cliente exibe: dados básicos, últimos 10 agendamentos (serviço, profissional, data, observações), próximos agendamentos agendados, crédito de indicação disponível (placeholder — Epic 5)
4. Campo "Observações do atendimento" editável pós-serviço (anotações livres)
5. Soft delete com confirmação
6. Performance: lista de 1000+ clientes renderiza em ≤ 1s com paginação

### Story 2.6: Appointment Status Lifecycle

Como **recepcionista**, quero **mudar o status do agendamento (confirmado, atendido, no-show, cancelado)**, para que **eu rastreie eventos operacionais e métricas de no-show**.

#### Acceptance Criteria

1. Estados possíveis: `PENDING_CONFIRMATION`, `CONFIRMED`, `COMPLETED` (atendido), `NO_SHOW`, `CANCELED`
2. Transições válidas documentadas (state machine): PENDING → CONFIRMED | CANCELED; CONFIRMED → COMPLETED | NO_SHOW | CANCELED
3. Ação manual via menu do card de agendamento (confirmar, marcar atendido, marcar no-show, cancelar)
4. Cancelamento registra motivo (opcional — dropdown + texto livre)
5. Histórico de transições persistido em tabela `appointment_status_log` (auditoria)
6. Métrica de no-show calculável por período (agregação dos estados `NO_SHOW`/`COMPLETED`)
7. Passa teste E2E de cada transição

### Story 2.7: Client-Side Appointment Management

Como **cliente final**, quero **cancelar ou reagendar meu agendamento via link único**, para que **eu não precise ligar para o salão**.

#### Acceptance Criteria

1. Cliente recebe URL única `softhair.com.br/agendamento/{token}` após confirmar (via WhatsApp — integração completa em Epic 3; nesta story, URL pode ser testada manualmente)
2. Token é JWT assinado com validade até data do agendamento
3. Página mostra resumo do agendamento + ações: "Cancelar" e "Reagendar"
4. Janela de cancelamento configurável pelo salão (default 24h antes)
5. Reagendar abre mesmo fluxo de Story 2.4 (novo slot dentro das disponibilidades)
6. Cancelamento atualiza status para `CANCELED` e libera o slot na agenda do salão em tempo real
7. Tela pós-ação confirma ao cliente + sugere reagendar se cancelou

---

## Epic 3 — WhatsApp Messaging Automation

**Epic Goal:** Automatizar o ciclo de comunicação com cliente via WhatsApp Business API oficial + Chatwoot, eliminando o trabalho manual da recepção e reduzindo no-show. Ao fim do epic, confirmações e lembretes acontecem sem intervenção humana, e o status do agendamento é atualizado automaticamente com base na resposta do cliente.

### Story 3.1: Chatwoot Self-Hosted Setup

Como **dev**, quero **Chatwoot self-hosted rodando em Railway/Fly.io conectado ao banco Supabase auxiliar**, para que **o produto tenha camada open-source de orquestração de mensagens**.

#### Acceptance Criteria

1. Chatwoot deployed em Railway (ou Fly.io) com Postgres dedicado (managed)
2. Domínio `chat.softhair.com.br` apontando para Chatwoot via DNS
3. Integração webhook Chatwoot → app SoftHair (callbacks para eventos de mensagem)
4. Painel admin acessível apenas via IP allowlist + 2FA
5. Backup diário do DB Chatwoot
6. Monitoring: healthcheck + alerta Slack se Chatwoot cair
7. Documentação de operação em `docs/infrastructure/chatwoot.md`

### Story 3.2: WhatsApp Business API Integration

Como **dev**, quero **integração com BSP de WhatsApp (360dialog ou Meta Cloud API direto)**, para que **o SoftHair envie e receba mensagens via conta oficial**.

#### Acceptance Criteria

1. BSP escolhido documentado com rationale (decisão em ADR: `docs/architecture/decisions/0001-whatsapp-bsp.md`)
2. Número de WhatsApp Business verificado na Meta (número dedicado, não pessoal)
3. Credenciais armazenadas em Supabase Vault / Vercel env
4. Wrapper `packages/messaging/whatsapp.ts` com métodos: `sendTemplate`, `sendText` (se permitido pelo BSP), `receiveWebhook`
5. Testes de integração com mock do BSP para CI
6. Health-check incluído na rota `/healthz`

### Story 3.3: Template Management & Meta Approval

Como **dono do produto**, quero **templates aprovados pela Meta disponíveis no sistema**, para que **confirmações e lembretes possam ser enviados em produção**.

#### Acceptance Criteria

1. 5 templates utility iniciais submetidos à Meta:
   - `confirm_24h_v1` (confirmação 24h antes)
   - `remind_2h_v1` (lembrete 2h antes)
   - `otp_login_v1` (OTP para magic link)
   - `booking_confirmed_v1` (confirmação de agendamento realizado)
   - `cancellation_notice_v1` (aviso de cancelamento pelo salão)
2. Cada template com 2 variantes em PT-BR (neutra + informal) para testes A/B futuros
3. Aprovação da Meta confirmada para todos os 5 (SLA típico 24-72h)
4. Tabela `whatsapp_templates` persiste metadados (nome, idioma, status, placeholders)
5. Dashboard admin do SoftHair lista templates e seus status de aprovação
6. Template rejeitado gera alerta automático ao founder via Sentry/Slack

### Story 3.4: Automated 24h Confirmation

Como **dono do salão**, quero **confirmação automática enviada 24h antes do agendamento**, para que **o cliente confirme presença e reduza no-show**.

#### Acceptance Criteria

1. Worker (Inngest/Trigger.dev) agenda job ao criar agendamento: disparar confirmação exatamente 24h antes (ajustado para horário comercial do salão — não manda às 3h da manhã)
2. Job busca template aprovado `confirm_24h_v1` e envia via BSP
3. Placeholder do template inclui: nome do cliente, nome do profissional, serviço, data/hora, nome do salão
4. Se agendamento foi criado com < 24h de antecedência, envia confirmação imediata
5. Se agendamento foi cancelado antes do job rodar, job é cancelado
6. Falha no envio (BSP down, número inválido) registra em log + retry automático (max 3 tentativas com backoff exponencial)
7. Dashboard do salão exibe status "Confirmação enviada" no card do agendamento
8. Passa teste E2E com mock do BSP

### Story 3.5: Automated 2h Reminder

Como **dono do salão**, quero **lembrete automático enviado 2h antes do agendamento**, para que **o cliente lembre do compromisso mesmo sem ter confirmado antes**.

#### Acceptance Criteria

1. Worker agenda job: disparar lembrete 2h antes
2. Envia template `remind_2h_v1` (distinto do de confirmação)
3. Só envia se status atual não for `CANCELED` nem `COMPLETED`
4. Retry e logging idênticos à Story 3.4
5. Dashboard mostra status "Lembrete enviado"

### Story 3.6: Client Response Handling & Status Update

Como **dono do salão**, quero **o status do agendamento atualizado automaticamente com base na resposta do cliente**, para que **eu não gaste tempo atualizando manualmente**.

#### Acceptance Criteria

1. Webhook recebe resposta do cliente ao template de confirmação
2. Parsing da resposta: "SIM/CONFIRMO/OK/👍" → status `CONFIRMED`; "NÃO/CANCELO/NAO POSSO" → status `CANCELED`
3. Respostas ambíguas/diferentes são roteadas para Chatwoot (não fazem update automático; recepção responde manual)
4. Atualização do status dispara notificação realtime para o dashboard do salão
5. Cliente recebe template de acknowledgement ("Agendamento confirmado! Até amanhã ✨" ou "Cancelamento recebido. Esperamos você em outra oportunidade")
6. Logs completos de cada update para auditoria
7. Passa teste E2E com simulação de mensagens inbound

### Story 3.7: Cost Monitoring & Budget Alerts

Como **founder**, quero **dashboard de custo de mensageria por salão**, para que **eu garanta margem unitária positiva (<= R$ 15/mês/salão)**.

#### Acceptance Criteria

1. Cada mensagem enviada registrada em `messaging_log` com custo estimado (baseado em preço do BSP por tipo de template)
2. Dashboard admin interno exibe: custo total do mês, custo médio por salão, salões acima do threshold (R$ 15/mês)
3. Alerta automático (Slack/email) quando salão ultrapassa 500 mensagens/mês
4. Agregação mensal exportável em CSV para reconciliação

---

## Epic 4 — Finance, Commission & NFS-e

**Epic Goal:** Habilitar operação financeira completa do salão dentro do SoftHair: cálculo automático de comissão, dashboard financeiro com visibilidade real de faturamento/margem, e emissão de NFS-e integrada. Ao fim do epic, salão fecha o mês sem precisar de planilha paralela.

### Story 4.1: Commission Rule Engine

Como **dono do salão**, quero **configurar regras de comissão flexíveis por profissional**, para que **o cálculo automático reflita a realidade de contratos diferenciados**.

#### Acceptance Criteria

1. Perfil do profissional suporta 2 modos: (a) % fixa sobre serviço; (b) tabela por serviço (overrides específicos)
2. Serviço pode ter comissão específica que sobrescreve a default do profissional
3. Validação: total (% profissional + % salão) = 100%
4. Simulador interativo: "Se eu fizer 10 cortes a R$ 50, profissional X ganha R$ Y"
5. Alteração de regra NÃO afeta comissões de atendimentos já realizados (histórico preservado)
6. Passa unit test extenso do engine de comissão

### Story 4.2: Commission Calculation on Service Completion

Como **sistema**, quero **calcular comissão automaticamente ao marcar serviço como atendido**, para que **o valor devido ao profissional seja registrado sem input manual**.

#### Acceptance Criteria

1. Ao mudar status para `COMPLETED`, worker calcula comissão aplicando regra vigente
2. Registro persistido em `commission_entries` (agendamento_id, profissional_id, valor_servico, percentual_aplicado, valor_comissao, data_atendimento)
3. Comissão exibida no card do agendamento pós-conclusão
4. Se houver desconto aplicado no serviço, comissão é calculada sobre valor descontado (documentado em Definition of Done)
5. Testes unit cobrem: % fixa, tabela, override, desconto, múltiplos serviços no mesmo agendamento

### Story 4.3: Monthly Commission Report

Como **dono do salão**, quero **relatório mensal de comissão por profissional exportável**, para que **o pagamento seja rápido e livre de erro**.

#### Acceptance Criteria

1. Tela "Comissão" com filtro por período (default: mês corrente)
2. Tabela agregada: profissional, total de atendimentos, faturamento gerado, comissão devida
3. Expansão por linha mostra atendimentos individuais (data, cliente, serviço, valor, comissão)
4. Exportação para PDF (formatado para impressão) e CSV (para folha de pagamento)
5. Agregação executa em ≤ 1s para salão com 500 atendimentos/mês

### Story 4.4: Basic Financial Dashboard

Como **dono do salão**, quero **dashboard financeiro simples mostrando faturamento e ocupação**, para que **eu saiba como o negócio está performando sem abrir planilha**.

#### Acceptance Criteria

1. Tela "Financeiro" exibe: faturamento do dia/semana/mês, receita por profissional (bar chart), receita por serviço (top 10), taxa de ocupação (%), comissão total a pagar
2. Filtro de período (hoje, 7d, 30d, mês corrente, custom)
3. Gráficos renderizam em ≤ 800ms com 1000+ atendimentos no período
4. Tela é WCAG AA (cores acessíveis em gráficos, labels descritivos, alternativas textuais)

### Story 4.5: NFS-e Integration — Nuvem Fiscal/Focus NFe Setup

Como **dev**, quero **integração com parceiro NFS-e escolhido**, para que **o salão emita notas fiscais eletronicamente**.

#### Acceptance Criteria

1. Parceiro escolhido documentado em ADR (`docs/architecture/decisions/0002-nfse-partner.md`) com rationale (custo, cobertura de municípios, UX de API)
2. Municípios suportados no MVP: whitelist de 5 capitais (ex. São Paulo, Rio de Janeiro, Belo Horizonte, Curitiba, Porto Alegre) — validadas uma a uma
3. Credenciais + certificado digital armazenados com segurança (Supabase Vault)
4. Wrapper `packages/messaging/nfse.ts` ou similar com método `emitInvoice(appointmentId)`
5. Healthcheck valida conectividade com parceiro

### Story 4.6: NFS-e Emission on Demand

Como **recepcionista**, quero **emitir NFS-e com 1 clique pós-atendimento**, para que **o cliente receba nota fiscal sem eu ter que abrir outro sistema**.

#### Acceptance Criteria

1. Card de agendamento `COMPLETED` exibe botão "Emitir NFS-e" (se salão está em município suportado)
2. Click dispara emissão síncrona (timeout 15s); se OK, exibe protocolo + link do PDF
3. Se timeout, dispara retry assíncrono (worker)
4. NFS-e persistida em `invoices` (appointment_id, numero, protocolo, pdf_url, status, municipio)
5. Falha após 3 retries envia notificação push/email ao salão
6. Dashboard financeiro exibe "NFS-e emitidas" / "Pendentes" / "Falhas"
7. Taxa de sucesso monitorada (alerta se cair abaixo de 95%)

### Story 4.7: Client Invoice Delivery

Como **cliente final**, quero **receber minha NFS-e por WhatsApp**, para que **eu tenha a nota para reembolso (ex. plano de saúde) sem precisar pedir**.

#### Acceptance Criteria

1. Ao emissão NFS-e bem-sucedida, sistema envia template WhatsApp com link do PDF para o cliente
2. Template `invoice_delivered_v1` submetido e aprovado pela Meta
3. Cliente pode optar por não receber NFS-e automaticamente (configuração no perfil do cliente)
4. Logs de envio registrados

---

## Epic 5 — Growth Loop: Indicação C2C

**Epic Goal:** Ativar diferencial competitivo único no mercado BR — sistema de indicação cliente→cliente com crédito automático. Cada cliente do salão vira potencial canal de aquisição de novos clientes, criando growth loop orgânico que beneficia o salão (mais clientes) e o SoftHair (mais dados, mais lock-in).

### Story 5.1: Referral Link Generation per Client

Como **cliente do salão**, quero **um link único de indicação para compartilhar com amigas**, para que **eu ganhe crédito quando elas agendarem pela primeira vez**.

#### Acceptance Criteria

1. Cada cliente tem URL canônica `softhair.com.br/indica/{token}`
2. Token único persistido em `referral_tokens`
3. Recepção pode enviar link ao cliente via WhatsApp pelo sistema (template `referral_link_v1` aprovado) OU cliente pode acessar pelo próprio perfil (futuro)
4. Página pública do link mostra: avatar do salão, breve copy ("Fulana te convidou a conhecer {Salão}. Agende sua primeira visita e ambas ganham crédito!"), CTA agendar
5. Página rastreia conversão (análise posterior)

### Story 5.2: Referral Attribution on First Booking

Como **sistema**, quero **atribuir a indicação à cliente indicadora quando a nova cliente agenda pelo link**, para que **o crédito possa ser aplicado posteriormente**.

#### Acceptance Criteria

1. Agendamento via link de indicação é marcado com `referral_token` + `referrer_client_id`
2. Validação: nova cliente (telefone) não pode ter agendamento prévio no mesmo salão (senão não é indicação válida)
3. Regra contra fraude: 1 token só gera 1 indicação válida por par de telefones únicos
4. Atribuição aparece no perfil da cliente indicadora ("1 indicação pendente — confirmará quando amiga comparecer")
5. Passa unit test das regras de validação

### Story 5.3: Referral Confirmation on Attendance

Como **sistema**, quero **confirmar a indicação quando a nova cliente comparecer (status `COMPLETED`)**, para que **o crédito só seja efetivado em indicações reais**.

#### Acceptance Criteria

1. Ao mudar status do agendamento da nova cliente para `COMPLETED`, sistema dispara validação da indicação
2. Se válida, valor do crédito é adicionado ao saldo da cliente indicadora (valor configurável pelo salão — default R$ 20 ou 15% do serviço)
3. Indicadora recebe WhatsApp de notificação (template `referral_success_v1` aprovado)
4. Dashboard do salão exibe "X indicações confirmadas este mês" com ROI estimado
5. Transação de crédito persistida em `client_credits_log` (auditoria)

### Story 5.4: Automatic Credit Application on Next Booking

Como **cliente indicadora**, quero **meu crédito aplicado automaticamente no próximo agendamento**, para que **eu não precise pedir desconto ao salão**.

#### Acceptance Criteria

1. Quando cliente indicadora agenda novo serviço (via link público ou recepção), sistema verifica saldo de crédito
2. Se houver crédito, aplica automaticamente (até o limite do valor do serviço)
3. Cliente é notificada no fluxo de agendamento: "Você tem R$ X de crédito. Será aplicado neste agendamento."
4. Crédito parcial: se crédito > valor, saldo remanescente persiste
5. Comissão do profissional é calculada sobre valor ORIGINAL (não descontado) — salão absorve desconto
6. Nota fiscal emitida sobre valor efetivamente pago
7. Passa teste E2E cobrindo: crédito total ≥ serviço, crédito parcial, sem crédito

### Story 5.5: Referral Configuration per Salon

Como **dono do salão**, quero **configurar valor e regras da indicação**, para que **o programa se adapte à minha realidade financeira**.

#### Acceptance Criteria

1. Tela "Configurações > Indicação" permite: valor do crédito (R$ fixo OU % do serviço da primeira visita da indicada), validade do crédito (default 90 dias), on/off master switch
2. Preview: "Se regra for 15%, uma amiga de Maria fazendo serviço de R$ 100 gerará R$ 15 de crédito a Maria"
3. Mudança de regra NÃO afeta indicações em curso (histórico preservado)

### Story 5.6: Referral Dashboard

Como **dono do salão**, quero **ver performance do programa de indicação**, para que **eu avalie o ROI do growth loop**.

#### Acceptance Criteria

1. Tela "Indicação" exibe: indicações no mês (pendentes/confirmadas/expiradas), crédito total pago, novas clientes adquiridas via indicação, ROI estimado (receita da indicada − crédito pago)
2. Top 10 clientes-indicadoras (ranking)
3. Gráfico de indicações ao longo do tempo

### Story 5.7: LGPD Compliance for Referral Data

Como **sistema**, quero **garantir compliance LGPD na feature de indicação**, para que **não haja risco legal ao manipular telefones de terceiros**.

#### Acceptance Criteria

1. Cliente indicadora consente explicitamente ao compartilhar seu link ("Ao enviar, você declara que a pessoa autorizou receber mensagem do salão")
2. Tela pública do link é acessada sem rastreamento invasivo (sem third-party trackers)
3. Nova cliente consente normalmente no fluxo de agendamento (mesmo de Story 2.4)
4. Documentação LGPD atualizada em `docs/compliance/lgpd.md`

---

## Checklist Results Report

*Esta seção será preenchida após a execução do `*execute-checklist pm-checklist` — a executar antes do handoff ao @po.*

---

## Next Steps

### UX Expert Prompt

@ux-design-expert, este PRD (`docs/prd.md` v1.0) define SoftHair — SaaS de gestão para salões de beleza BR com foco em mobile-first PWA, WCAG AA, e anti-fricção radical. Por favor, inicie em **'Front-End Spec Generation Mode'** e crie o `docs/front-end-spec.md` detalhando: wireframes por tela (13 core screens listados na seção UI Design Goals), sistema de design tokens (paleta, tipografia, spacing), especificação dos 2 fluxos críticos E2E (onboarding salão + self-booking cliente), e mockups prioritários para Epic 1 + Epic 2. Branding assumido: rosa nude + off-white + preto suave + dourado accent (a validar com founder).

### Architect Prompt

@architect (Aria), este PRD (`docs/prd.md` v1.0) define stack e constraints de SoftHair. Decisões técnicas principais já declaradas nas Technical Assumptions: Next.js 15 + Supabase + Chatwoot self-hosted + WhatsApp Business API oficial (via 360dialog ou Meta Cloud — ADR pendente) + Nuvem Fiscal/Focus NFe (ADR pendente). Por favor, inicie em **'Architecture Mode'** e crie `docs/architecture.md` cobrindo: diagrama de contexto + containers (C4), modelo de dados detalhado (expansão das tabelas listadas em Story 1.2), arquitetura de filas/jobs (Inngest vs Trigger.dev — escolher), padrão multi-tenant com RLS, estratégia de deploy (Vercel + Railway + Supabase), observabilidade (Sentry + PostHog + Vercel Analytics), e os 2 ADRs pendentes (WhatsApp BSP + NFS-e partner). Delegue a `@data-engineer` (Dara) o DDL completo de RLS e migrations.
