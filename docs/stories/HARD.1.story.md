# Story HARD.1: Hardening Sprint Pré-Epic 3 — E2E Playwright + axe-core + GitHub Actions Update

## Status

InProgress

> 🚧 **Phase 1 of 2 — parallel-safe scope landed (2026-05-02).** Tasks 1, 2.3, 2.4, 2.5, 8, 9, 10 done. Tasks 2.1, 2.2, 3-7, 11 paused on `PREREQ-TEST-USER` (Founder) + `PREREQ-SUPABASE-SERVICE-ROLE` (@devops). Resume in a follow-up `*develop` session once prereqs unblock.

## Executor Assignment

```
executor: "@dev"
quality_gate: "@qa"
quality_gate_tools: [coderabbit, playwright, axe-core, lighthouse]
```

> ℹ️ **Cross-epic hardening track.** Esta story não pertence a Epic 1, 2 ou 3 — é um sprint coeso de tooling/qualidade entre Epic 2 (fechada 100% em 2026-04-29) e Epic 3 (deferred to Phase 2). Origem: handoff `po-to-sm-hardening-sprint-2026-04-29.yaml` + decisão Founder 2026-04-29 promovendo 7 itens P1/P2 → P0. Justificativa em `docs/qa/backlog.md#priorização-recomendada`.

## Story

**As a** engineering team preparing for the next phase of product work,
**I want** a single hardening sprint that lands E2E coverage (Playwright + axe-core) for the 5 MVP stories that shipped without it AND updates GitHub Actions ahead of the Node 20 deprecation deadline,
**so that** the next epic starts on a green E2E baseline instead of accumulating same-day hotfixes for regressions only catchable in browser flow (precedent: Zod 4 datetime, REVOKE PUBLIC bug — both surfaced post-merge, not in CI).

## Acceptance Criteria

1. **Playwright runner instalado** em `apps/web/e2e/` com `apps/web/playwright.config.ts` configurando matrix **Chromium + Webkit**, headless em CI, headed em local (via `PWDEBUG=1` ou flag), `retries: 2` em CI / `0` em local, `video: 'retain-on-failure'`, `trace: 'retain-on-failure'`. Script `pnpm --filter @softhair/web test:e2e` roda a suíte.
2. **axe-core integrado** como fixture/helper Playwright (`apps/web/e2e/fixtures/axe.ts`) com assertion `assertNoA11yViolations(page, { include: 'main', exclude: ['#known-third-party'] })` — target **0 critical violations** em todas as specs (alinhado com `docs/front-end-spec.md` linha 862 "axe-core em Playwright E2E: falha bloqueia merge" + linha 979 "Accessibility violations (axe) | 0 critical | CI gate").
3. **5 specs E2E** cobrindo happy path + edge cases das stories que fecharam com cobertura E2E waived/deferred:
   - **1.5** `professional-crud.spec.ts` — create → edit → soft-delete + boundary do limite 1-20 profissionais
   - **1.6** `service-crud.spec.ts` — create com edge cases de duration (15/14/480/481 min) e commission (0/100/101%)
   - **1.7** `dashboard-hoje.spec.ts` — empty state + populated state com ≥3 agendamentos
   - **2.4** `self-booking.spec.ts` — fluxo 3 steps (date→slot→contact) com assertion **timing ≤60s** + checkbox LGPD obrigatória
   - **2.5** `clients.spec.ts` — list → search → detail → notes edit (autosave 800ms debounce) → soft-delete
4. **CI workflow E2E** rodando em PRs em `.github/workflows/ci.yml`. Job atual `e2e:` já existe (gate condicional em `apps/web/playwright.config.ts`), mas precisa de: matrix Chromium + Webkit, upload de `playwright-report/` e `test-results/` como artifact (`actions/upload-artifact@v4` ou v5 — ver AC5), `if: always()` no upload pra ter artifacts mesmo em fail.
5. **Workflows atualizados** de Node 20 deprecated → Node 24:
   - `actions/checkout@v4` → `@v5`
   - `actions/setup-node@v4` → `@v5` com `node-version: 24` (atualmente `22`)
   - `pnpm/action-setup@v4` → versão mais recente disponível que suporta Node 24 (verificar antes — releases podem ter saído entre o draft e a execução)
   - Aplicar em `ci.yml` (3 jobs: lint-test-build, e2e, lighthouse)
   - Validar root `package.json#engines.node` (atual `>=22.0.0`) — possível bump para `>=24.0.0` ou manter floor para permitir devs em Node 22 enquanto CI fixa em 24
6. **CI verde** na branch hardening antes do merge: lint + typecheck + unit (vitest, atual 21 passing) + build + novo job E2E (matrix Chromium + Webkit) — sem regressão nos 21 unit tests existentes.
7. **Documentação** `docs/testing/e2e.md` cobrindo: (a) como rodar local (`pnpm test:e2e`, `pnpm test:e2e:ui`, `pnpm test:e2e:debug`); (b) como debugar specs flaky (trace viewer, video review); (c) setup de seed data + login helper; (d) padrão de `data-testid` (preferência sobre selectors de texto/CSS).

## 🤖 CodeRabbit Integration

### Story Type Analysis

**Primary Type**: Deployment/Infrastructure (CI/CD + Node runtime upgrade)
**Secondary Type(s)**: Frontend (E2E test code), A11y tooling
**Complexity**: **High** — afeta CI gating, upgrade de runtime cross-cutting, 5 specs novos + setup. Maior risco: flakiness inicial bloqueando merges legítimos.

### Specialized Agent Assignment

**Primary Agents**:
- @dev (executor — instala Playwright, escreve specs, integra axe-core)
- @devops (workflow update, action versions, Node 24 runner config) — co-owns AC5

**Supporting Agents**:
- @qa (quality gate — confirma que specs cobrem ACs declarados nas stories originais 1.5/1.6/1.7/2.4/2.5)
- @ux-design-expert (review opcional dos `data-testid` para alinhar com design system)

### Quality Gate Tasks

- [ ] Pre-Commit (@dev): lint + typecheck + vitest (21 existentes) + build — sem regressão
- [ ] Pre-PR (@devops): rodar `act` localmente OU validar workflow YAML syntax com `actionlint`; CodeRabbit focus em workflow security (token scopes, third-party action pinning por SHA)
- [ ] Pre-Deployment (@devops): smoke run dos 5 specs em CI **antes** de declarar a story Done — se 1+ flaky, aplicar `test.skip` documentado em vez de retry-loop infinito

### Self-Healing Configuration

**Expected Self-Healing**:
- Primary Agent: @dev (light mode)
- Max Iterations: 2
- Timeout: 15 minutes
- Severity Filter: CRITICAL (auto-fix), HIGH (document only)

### CodeRabbit Focus Areas

**Primary Focus**:
- Workflow YAML: action pinning (SHA recomendado, tag mínimo), token permissions, secrets exposure
- Playwright config: timeouts adequados (cap em 30s/teste, total suite ≤10min), retries não-mascaradores, `headless: true` em CI obrigatório
- E2E specs: zero `page.waitForTimeout(N)` — usar `page.waitForResponse` / `page.waitForSelector` com state explícito (network-idle, attached, visible)

**Secondary Focus**:
- axe-core: tags WCAG 2.1 AA configuradas (`['wcag2a', 'wcag2aa', 'wcag21aa']`), exclusions documentadas com link para issue
- Test data: seed pattern não vaza credentials reais; cleanup hooks idempotentes
- Node 24 upgrade: nenhum lockfile mudança subreptícia (validar `pnpm-lock.yaml` diff)

## Tasks / Subtasks

> **Convenção:** cada task referencia AC. Marker `[ ]` = pendente, `[x]` = concluído.

- [x] **Task 1: Install + configure Playwright (AC: 1)**
  - [x] 1.1 Adicionar deps em `apps/web/package.json`: `@playwright/test@^1.59.1` (latest stable; arch.md "1.4x" stale) e `@axe-core/playwright@^4.11.3` (devDependencies)
  - [x] 1.2 Criar `apps/web/playwright.config.ts` — projects Chromium + Webkit, `testDir: './e2e'`, `baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'`. **Deviation:** webServer command bifurca CI (`next build && next start`) vs local (`next dev`) — dev mode tem first-compile latency >30s que falha smoke spec; production mode em CI é determinístico. `webServer` é `undefined` quando `PLAYWRIGHT_BASE_URL` é set (dev gerencia o server).
  - [x] 1.3 Adicionar scripts em `apps/web/package.json`: `test:e2e`, `test:e2e:ui`, `test:e2e:debug`. **Adicional:** `test:e2e` em root `package.json` (`turbo run test:e2e`) + `test:e2e` task em `turbo.json` — story Dev Notes#CI Workflow flagou esta ambiguidade; escolhi turbo pattern para alinhar com `test`/`build`/`lint` existentes
  - [x] 1.4 `.gitignore` raiz já cobria `playwright-report/` + `test-results/` (linhas 27-31). Apenas adicionei `playwright/.cache/`. Não precisou criar `apps/web/.gitignore`
  - [x] 1.5 Browsers Chromium + Webkit instalados via `pnpm --filter @softhair/web exec playwright install chromium webkit` (sem `--with-deps` em Windows — esse flag é para apt-get em Linux; CI roda em Linux com `--with-deps`)
  - [x] 1.6 Smoke run executado — 6 tests passing (3 specs × 2 browsers) em 1.1m. Ver `apps/web/e2e/smoke.spec.ts` (canary spec — não estava no scope original; adicionado para validar pipeline end-to-end e prevenir Playwright erro com 0 specs)

- [ ] **Task 2: Setup E2E infra — auth + seed + axe fixtures (AC: 1, 2)** — ⛔ partially blocked
  - [ ] 2.1 ⛔ BLOCKED on `PREREQ-TEST-USER` (Founder). Will create `apps/web/e2e/fixtures/auth.ts` once test user `e2e+test@softhair.com` exists in `softhair-dev`
  - [ ] 2.2 ⛔ BLOCKED on `PREREQ-SUPABASE-SERVICE-ROLE` (@devops to confirm CI secret). Will create `apps/web/e2e/fixtures/seed.ts` once secret is verified present
  - [x] 2.3 `apps/web/e2e/fixtures/axe.ts` criado — `assertNoA11yViolations(page, options)` com tags `['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']` (incluí wcag21a por simetria com wcag2a). `failOnImpact` configurável (default: `critical`); validation surfaces violation list com impact + help URL para debug
  - [x] 2.4 `apps/web/e2e/fixtures/index.ts` criado — extend `test` com fixture `axe` (auth + seed deixados como placeholder com comentário explicativo — adicionar quando 2.1/2.2 desbloquearem). Specs importam de `'./fixtures'` (validado via smoke.spec.ts)
  - [x] 2.5 Convenção `data-testid` documentada em `docs/testing/e2e.md` (Conventions section #1). Lista de testids novos a adicionar fica como TBD nas Tasks 3-7 (cada spec lista seus testids ao ser implementado)

- [ ] **Task 3: Spec 1.5 — professional-crud (AC: 3)**
  - [ ] 3.1 `apps/web/e2e/professional-crud.spec.ts` — happy: login → /profissionais → "Adicionar" → preencher (nome, slug auto-gerado, especialidades, comissão) → save → confirma na lista
  - [ ] 3.2 Edge: edit (mudar comissão de 50% → 60%) → save → confirma valor persistido após refresh
  - [ ] 3.3 Edge: soft-delete (botão "Arquivar" → confirm dialog → some da lista ativa, aparece em "Arquivados" se UI existir)
  - [ ] 3.4 Boundary: tentar criar 21º profissional (apenas se setup test salon tiver fixture de 20 prof) — assert error message ou disabled state
  - [ ] 3.5 a11y: `assertNoA11yViolations` no /profissionais index e no form modal/page
  - [ ] 3.6 Adicionar `data-testid` necessários no código apps/web (TBD pelo dev — listar em Dev Notes)
  - [ ] **Resolves:** `1.5-TEST-001` (P0 promovido)

- [ ] **Task 4: Spec 1.6 — service-crud (AC: 3)**
  - [ ] 4.1 `apps/web/e2e/service-crud.spec.ts` — happy: login → /servicos → "Adicionar" → categoria + custom name + duration 60min + price R$ 80 + commission 50% → save
  - [ ] 4.2 Edge duration: tentar 14min (reject), 15min (ok), 480min (ok), 481min (reject) — assert error messages
  - [ ] 4.3 Edge commission: 0% (ok), 100% (ok), 101% (reject)
  - [ ] 4.4 a11y: `assertNoA11yViolations` no /servicos
  - [ ] **Resolves:** `1.6-TEST-001` (P0 promovido)

- [ ] **Task 5: Spec 1.7 — dashboard-hoje (AC: 3)**
  - [ ] 5.1 `apps/web/e2e/dashboard-hoje.spec.ts` — empty state: salon recém-criado sem appointments → assert empty illustration + CTA
  - [ ] 5.2 Populated state: seed 3 appointments para hoje → reload /hoje → assert 3 cards renderizados (data-testid `appointment-card`) + ordem cronológica
  - [ ] 5.3 a11y: `assertNoA11yViolations` em ambos states (empty + populated)
  - [ ] **Resolves:** `1.7-TEST-001` (P0 promovido) + `1.7-TEST-002` (P0 promovido — par natural)

- [ ] **Task 6: Spec 2.4 — self-booking (AC: 3)**
  - [ ] 6.1 `apps/web/e2e/self-booking.spec.ts` — abrir `/{salon}/{professional}/book` (sem login) → step 1 (data) → step 2 (slot) → step 3 (contact: nome/email/checkbox LGPD) → submit
  - [ ] 6.2 Wrap o fluxo em `Date.now()` start/end e assert delta ≤ 60_000ms (60s) — **se CI mostrar flakiness sob carga, cap em 90_000ms com console.warn quando passar de 60s** (não falhar; only warn). Ver Risks#TIMING-2_4
  - [ ] 6.3 LGPD: tentar submit com checkbox unchecked → assert error visible + form bloqueado
  - [ ] 6.4 Verificar redirect pós-success para `/agendamento/{jwt}?justCreated=1` (Story 2.7 path)
  - [ ] 6.5 a11y: `assertNoA11yViolations` em cada step
  - [ ] **Resolves:** `2.4-TEST-001` (P0 promovido)

- [ ] **Task 7: Spec 2.5 — clients (AC: 3)**
  - [ ] 7.1 `apps/web/e2e/clients.spec.ts` — login → /clientes → assert lista renderiza (seed: 3 clients pré-existentes)
  - [ ] 7.2 Search: digitar parte do nome → assert filter aplica (debounce 300ms — esperar com `page.waitForFunction` invariant, não `waitForTimeout`)
  - [ ] 7.3 Detail: click em client → /clientes/[id] → ver appointments history + notes editor
  - [ ] 7.4 Notes edit: clicar editor → digitar texto → aguardar **800ms** (debounce autosave) → assert "Salvo ✓" indicator → reload → texto persiste. Cobre `2.5-MNT-001` (setTimeout cleanup) implicitamente
  - [ ] 7.5 Soft-delete: client detail → "Arquivar" → confirm → redirect /clientes → cliente sai da lista ativa
  - [ ] 7.6 a11y: `assertNoA11yViolations` em /clientes e /clientes/[id]
  - [ ] **Resolves:** `2.5-TEST-001` (P0 promovido)

- [x] **Task 8: GitHub Actions — E2E job + matrix (AC: 4)**
  - [x] 8.1 `ci.yml` job `e2e:` — `strategy.matrix.browser: [chromium, webkit]` + `fail-fast: false` (queremos saber falhas em ambos browsers, não fail-fast). `playwright test --project=${{ matrix.browser }}` invocado via `pnpm --filter @softhair/web exec`
  - [x] 8.2 Upload-artifact steps adicionados — `playwright-report-${browser}` (always, 7 days retention) + `test-results-${browser}` (failure only, 3 days retention). **Versão atualizada para `@v7` (latest)** — handoff dizia v5 mas v7 é current.
  - [x] 8.3 `continue-on-error: true` adicionado com comentário `# TODO(HARD.1 follow-up): remove this line after 1 week of stable green E2E.` para discoverable via grep. Tracking via Task 11 close-out
  - [x] 8.4 actionlint não disponível via `pnpm dlx` (`@rhysd/actionlint-installer` falha — é binário Go). Fallback: validei YAML via `js-yaml` parse + assertion nos campos críticos (jobs, matrix, continue-on-error, action versions). Considerar `gh action add actionlint` step em CI follow-up

- [x] **Task 9: Workflows update — Node 24 + actions latest (AC: 5)**
  - [x] 9.1 Versões researched via `gh api repos/.../releases/latest` em 2026-05-02. **Surpresa:** versões shifted vs handoff (2026-04-29):
    - `actions/checkout`: handoff disse v5 → atual stable **v6.0.2** ✅ usado
    - `actions/setup-node`: handoff disse v5 → atual stable **v6.4.0** ✅ usado
    - `pnpm/action-setup`: handoff disse v5 → atual stable **v5.0.0** ✅ matches handoff
    - `actions/upload-artifact`: handoff disse v4 → atual stable **v7.0.1** ✅ usado
  - [x] 9.2 `ci.yml` editado em 3 jobs (detect, lint-test-build, e2e, lighthouse — na verdade 4 jobs agora). Todos com versions acima + `node-version: 24`. **Nota Founder/QA:** lockfile diff é normal e mínimo — apenas adições de @playwright/test + @axe-core/playwright + transitivas
  - [x] 9.3 Root `package.json#engines.node` mantido `>=22.0.0` per decisão da story. Trade-off: devs locais podem rodar Node 22 OU Node 24 (validei localmente em Node 24.14.0). CI fixa em 24 via workflows. Não bumpado para `>=24.0.0` para não quebrar devs que ainda não atualizaram
  - [x] 9.4 Lockfile validado — `git diff --stat pnpm-lock.yaml` mostra +60/-2 lines, tudo relacionado a @playwright/test + @axe-core/playwright. Sem deps inesperadas precisando Node 24+
  - [x] 9.5 **Resolves:** `2.5-INFRA-001` (P0 deadline-driven 2026-06-02 — agora superado por 1 mês de antecedência)

- [x] **Task 10: Documentation — docs/testing/e2e.md (AC: 7)**
  - [x] 10.1 `docs/testing/e2e.md` criado com TL;DR, Stack, Repository layout, Conventions (5 non-negotiables incluindo `data-testid` + zero `waitForTimeout` + `domcontentloaded` over `load` + axe-on-every-spec + test isolation), Debugging flaky, CI integration, Seed data placeholder, Local environment, Relationship to other gates, Adding-a-new-spec checklist, Known gotchas, Future work
  - [x] 10.2 Link adicionado ao `README.md` (Scripts table) + `docs/architecture.md` (callout box após Tech Stack table, antes de Data Models)

- [ ] **Task 11: Smoke run em CI + ajuste de timing/retry (AC: 6)**
  - [ ] 11.1 Push branch → abrir draft PR → confirmar 5 jobs verdes (lint-test-build, e2e:chromium, e2e:webkit, lighthouse + pré-existentes)
  - [ ] 11.2 Se algum spec flaky em CI mas verde local: aumentar timeout específico (cap 30s) OU substituir `waitForResponse` mais granular OU `test.fixme` documentado com link pra follow-up issue. **Não usar `retries:5+` como solução.**
  - [ ] 11.3 Confirmar artifacts upload — baixar `playwright-report-chromium.zip` e abrir HTML report localmente
  - [ ] 11.4 Atualizar `docs/qa/backlog.md` — marcar 7 itens como `done`:
    - 1.5-TEST-001, 1.6-TEST-001, 1.7-TEST-001, 1.7-TEST-002, 2.4-TEST-001, 2.5-TEST-001, 2.5-INFRA-001
  - [ ] 11.5 Marcar story Status: Ready for Review + `*push` via @devops (NÃO @dev)

## Dev Notes

### Source citations

- **Tech stack escolha de Playwright + Vitest:** `[Source: docs/architecture.md#Tech Stack lines 199-200]` confirma Vitest 2.x e Playwright 1.4x como stack DEFINITIVA. Não introduzir Cypress, Jest, ou outra ferramenta.
- **a11y validation tool:** `[Source: docs/front-end-spec.md#Validação automatizada lines 860-863]` — "axe-core em Playwright E2E: falha bloqueia merge" + "Lighthouse Accessibility ≥ 95 em Chrome DevTools CI"
- **a11y target:** `[Source: docs/front-end-spec.md#Métricas line 979]` — "Accessibility violations (axe) | 0 critical | CI gate"
- **Touch targets:** `[Source: docs/front-end-spec.md#Mobile-first rules line 887]` — "Touch targets: mínimo 44×44px (Apple HIG)" — **2.4-A11Y-001 backlog item** (LGPD checkbox 16×16px) NÃO está nesta story porque mitigation `<label>` é aceita; spec 2.4 deve usar a label.

### Previous Story Insights (2.7)

- @dev cycle 2.7 (PR #26) entregou 14 unit tests e foi explícita ao DEFERRER E2E (Task 10 da 2.7) — esta story é o resgate desse débito.
- Gotcha **`feedback_zod_4_datetime_breaking.md`** (memory) — Zod 4 `.datetime()` rejeita `+00:00` offset de PostgREST. Specs de 2.4 e 2.7 que envolvem datas devem usar `data-testid` em selectors, não dependem de string formatting que pode quebrar com tz.
- Pattern de tests em 2.7: `// @vitest-environment node` foi necessário para jose v6 webapi. **Para Playwright isso não importa** — Playwright roda em Node nativo, sem jsdom.
- ENV var APPOINTMENT_TOKEN_SECRET configurada em Vercel preview/prod (Story 2.7 prerequisite via @devops Gage). Para E2E local, copiar do `.env.example` para `.env.local`.

### Tech stack — versões pinadas

[Source: docs/architecture.md#Tech Stack lines 172-214 + apps/web/package.json]

- Next.js 15.0.7 (App Router + Server Actions)
- React 19 RC (`19.0.0-rc-02c0e824-20241028`)
- TypeScript 5.6+
- Vitest 2.1.4 (env padrão: jsdom; override `// @vitest-environment node` quando necessário)
- Tailwind 4 beta + shadcn/ui
- Zod 4.3.6 (gotcha: `.datetime({ offset: true })` para PostgREST timestamps)
- jose 6.2.2 (JWT — Story 2.7)
- Supabase SSR 0.10.2 + supabase-js 2.46.1
- Node engines: `>=22.0.0` (root package.json)
- pnpm 9.12.0 (`packageManager` field)

### File Locations

[Source: project structure inspection — turborepo monorepo]

```
apps/web/
├── playwright.config.ts          ← NEW (Task 1)
├── e2e/                          ← NEW (Tasks 2-7)
│   ├── fixtures/
│   │   ├── auth.ts
│   │   ├── seed.ts
│   │   ├── axe.ts
│   │   └── index.ts
│   ├── professional-crud.spec.ts
│   ├── service-crud.spec.ts
│   ├── dashboard-hoje.spec.ts
│   ├── self-booking.spec.ts
│   └── clients.spec.ts
├── package.json                  ← MODIFIED (deps + scripts)
└── .gitignore                    ← MODIFIED (test artifacts)

.github/workflows/
└── ci.yml                        ← MODIFIED (Tasks 8-9)

docs/testing/
└── e2e.md                        ← NEW (Task 10)
```

### CI Workflow current state

[Source: `.github/workflows/ci.yml` lines 17-118]

- 4 jobs hoje: `detect`, `lint-test-build`, `e2e`, `lighthouse`
- `e2e` job já existe mas é **gated** por `if: needs.detect.outputs.has_e2e == 'true'` — gate vira true quando `apps/web/playwright.config.ts` for criado (Task 1.2)
- Comando E2E atual no CI: `pnpm test:e2e` (linha 92) — script root NÃO existe ainda. Adicionar em `apps/web/package.json` (Task 1.3) é suficiente porque turbo encontra via filter; **OU** adicionar `"test:e2e": "turbo run test:e2e"` no root `package.json` (escolher um pattern e documentar)
- `pnpm exec playwright install --with-deps` (linha 91) já está pré-configurado — não precisa adicionar step
- Lighthouse CI (PR #19) já em prod, Lighthouse `1.7-PERF-002` está `escalated` mas done

### Workflow versions to research at execution time

⚠️ **Antes de Task 9, verificar versões disponíveis** (releases podem ter saído entre o draft de 2026-04-29 e a execução):

```bash
# Comandos sugeridos:
gh api repos/actions/checkout/releases/latest --jq .tag_name
gh api repos/actions/setup-node/releases/latest --jq .tag_name
gh api repos/pnpm/action-setup/releases/latest --jq .tag_name
gh api repos/actions/upload-artifact/releases/latest --jq .tag_name
```

Documentar versões escolhidas em Dev Agent Record / Completion Notes.

### Architectural Pattern — fixture-driven Playwright

[Source: Playwright official docs pattern, no AIOX-internal precedent yet]

```typescript
// apps/web/e2e/fixtures/index.ts (Task 2.4)
import { test as base } from '@playwright/test';
import { setupAuth } from './auth';
import { setupSeed } from './seed';
import { setupAxe } from './axe';

type Fixtures = {
  authedPage: Page;          // pre-logged-in test user
  seed: SeedHelpers;         // db setup helpers
  axe: AxeHelpers;           // a11y assertion helper
};

export const test = base.extend<Fixtures>({
  authedPage: async ({ page }, use) => {
    await setupAuth(page);
    await use(page);
  },
  seed: async ({}, use) => {
    const helpers = await setupSeed();
    await use(helpers);
    await helpers.cleanup();   // teardown
  },
  axe: async ({ page }, use) => {
    await use(setupAxe(page));
  },
});

export { expect } from '@playwright/test';
```

Specs importam de `'../fixtures'` em vez de `'@playwright/test'` direto.

### Testing Requirements

[Source: docs/architecture.md#Tech Stack + docs/front-end-spec.md#Validação automatizada]

- **Unit tests existentes:** 21 passing em vitest. Esta story NÃO modifica nem adiciona unit tests.
- **E2E:** 5 specs novos (Tasks 3-7). Cada spec **deve** incluir 1+ `assertNoA11yViolations` chamada.
- **Lighthouse CI:** já configurado (PR #19), Performance ≥ 85 mobile + Accessibility ≥ 95. Esta story NÃO altera Lighthouse config.
- **Cross-browser:** Chromium + Webkit (não Firefox — out-of-scope per handoff).
- **Mobile emulation:** usar viewport padrão Playwright (responsive default), não device-specific (out-of-scope per handoff).

### Known constraints + gotchas

- **Webkit é mais lento** que Chromium em CI (~2x). Plan: timeout adequado, não tentar otimizar abaixo do necessário.
- **Test user em softhair-dev** — não usar fixture do Founder. Criar test user dedicado (`e2e+test@softhair.com`) com salon mínimo: 3 services + 2 professionals + 3 clients pré-seedados. Documentar SQL de setup em `docs/testing/e2e.md`. Founder coordena criação (handoff prerequisite).
- **Service Role key** para seed — só pode rodar em CI com secret `SUPABASE_SERVICE_ROLE_KEY` (já presente? confirmar com @devops antes de Task 2.2). Se ausente, fallback: API mock OU pre-baked DB snapshot.
- **Node 24 disponibilidade:** GitHub Actions runners ubuntu-latest devem suportar Node 24 via `actions/setup-node@v5`. Se não, usar `actions/setup-node@v4` com `node-version: 24.x` (ainda valid mas com warning).
- **`continue-on-error: true` em E2E job (Task 8.3)** — temporário, remover em follow-up. Marcar TODO no YAML com link para issue/backlog.

### Project Structure Notes

- Não há `docs/architecture/` shards (architecture é monolítico em `docs/architecture.md`). `core-config.yaml#architectureSharded: true` está desincronizado com a realidade. **Não corrigir nesta story** — out of scope. Reportar para @architect/@po em separado.
- `docs/framework/` existe mas contém apenas handoffs de Apr-21, não os `tech-stack.md`/`source-tree.md`/`coding-standards.md` declarados em `core-config.yaml#devLoadAlwaysFiles`. **Não corrigir nesta story** — usar fallback monolítico para citações.

### Backlog impact (status updates após merge)

[Source: docs/qa/backlog.md + handoff `po-to-sm-hardening-sprint-2026-04-29.yaml#backlog_items_consumed`]

| ID | Severity | Pré-merge | Pós-merge |
|---|---|---|---|
| 1.5-TEST-001 | medium P0 | open | done |
| 1.6-TEST-001 | medium P0 | open | done |
| 1.7-TEST-001 | medium P0 | open | done |
| 1.7-TEST-002 | medium P0 | open | done |
| 2.4-TEST-001 | medium P0 | open | done |
| 2.5-TEST-001 | low P0 | open | done |
| 2.5-INFRA-001 | medium P0 | open | done |

Total: **7 itens P0 → done.** Atualização do backlog é Task 11.4.

## Risks

| ID | Severity | Description | Mitigation | Owner |
|---|---|---|---|---|
| RISK-FLAKY | high | E2E specs notoriously flaky em CI sob carga (network jitter, animation timing). Risco: bloquear merges legítimos por flake. | (a) `data-testid` selectors only; (b) `retries: 2` em CI; (c) `waitForResponse`/`waitForSelector` em vez de `waitForTimeout`; (d) `continue-on-error: true` na primeira semana, remover após. | @dev |
| RISK-TIMING-2_4 | medium | Spec 2.4 tem assert de timing ≤60s. CI sob carga pode passar de 60s ocasionalmente. | Cap em 90s com `console.warn` quando passar de 60s — não falhar o teste, apenas logar. Reverter para hard-fail após 2 weeks de baseline. | @dev |
| RISK-NODE-24-BREAK | medium | Atualização Node 22 → 24 pode quebrar deps (especialmente Tailwind 4 beta, React 19 RC). | Validar `pnpm-lock.yaml` diff zero em Node 24; rodar full CI em branch antes de merge. Rollback simples: revert workflow YAML commit (lockfile preservado). | @devops |
| RISK-PNPM-V5 | low | `pnpm/action-setup@v5` pode não existir ainda — release timing depende do GitHub. | Task 9.1 valida na execução. Fallback: manter `@v4` se v5 não existir, atualizar `actions/checkout` + `actions/setup-node` separadamente. | @devops |
| RISK-TEST-USER | medium | Test user em softhair-dev precisa ser criado antes da Task 2 — depende do Founder. | Bloquear Task 2.2 até confirmação. Tasks 1, 8, 9, 10 podem rodar em paralelo (sem dep de seed). | Founder |
| RISK-FIRST-E2E | low | Esta é a primeira E2E suite do projeto — sem precedente interno. | Documentar escolhas em `docs/testing/e2e.md` (Task 10) — vira referência para Epic 3 e além. | @dev |

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context) — AIOX @dev/Dex persona v3.0. Permission mode: ⚠️ Ask. Mode: interactive (per @po handoff recommendation due to complexity=High + first E2E suite).

### Debug Log References

- **Next 15 dev-mode `load` event quirk:** `page.goto('/')` with default `waitUntil: 'load'` times out indefinitely because the HMR websocket keeps the load event firing. Fix: use `waitUntil: 'domcontentloaded'`. This is now Convention #3 in `docs/testing/e2e.md`. Surfaced via initial smoke spec failure on chromium + webkit (3/4 tests timing out before fix; 6/6 passing after).
- **First-compile latency in dev:** Next 15 compiles routes on demand; first request to `/` took >30s on Webkit. Fix: bumped global Playwright `timeout: 30_000 → 60_000` AND switched CI to production mode (`next build && next start`) via `playwright.config.ts` `webServer.command` ternary on `isCI`. Local stays `next dev` for hot reload.
- **`pnpm install` reinstall prompt:** First `pnpm install` after editing `apps/web/package.json` triggered an interactive "remove and reinstall from scratch" Y/n prompt — workaround `echo Y | pnpm install`. Probably triggered by `packageManager` mismatch heuristic; not blocking.
- **`pnpm dlx actionlint` fails:** No npm package wraps actionlint (Go binary). Fallback: js-yaml parse + assertion. Follow-up idea: add `download-artifact-driven actionlint` step to CI (out of scope for HARD.1).
- **Cosmetic `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL`:** `pnpm --filter ... exec playwright test --list` exits non-zero when 0 tests found (or sometimes even on success); pnpm wraps that as a recursive-exec error. Doesn't affect CI verdict (CI uses turbo path), purely local annoyance. Documented as a Known Gotcha in `docs/testing/e2e.md`.

### Completion Notes List

- ✅ **Phase 1 of 2 (parallel-safe scope) shipped.** Tasks 1, 2.3, 2.4, 2.5, 8, 9, 10 complete. Tasks 2.1, 2.2, 3-7, 11 paused on prereqs.
- ✅ **6/6 smoke tests passing** locally (3 specs × 2 browsers, ~1.1m). End-to-end pipeline validated: Playwright config → fixtures (axe) → spec → page load → axe a11y assertion → healthz route. Homepage already has 0 critical a11y violations — strong baseline for the real specs.
- ✅ **Action versions upgraded beyond handoff target.** Handoff (2026-04-29) said v5; latest stable in 2026-05-02 is checkout v6.0.2, setup-node v6.4.0, upload-artifact v7.0.1. The story's Task 9.1 ("research at execution time") explicitly anticipated this drift. Documented in subtask 9.1 notes.
- ✅ **Smoke spec added beyond original scope.** Original story listed 5 specs (1.5/1.6/1.7/2.4/2.5). Added `apps/web/e2e/smoke.spec.ts` (3 trivial tests: homepage lang attribute, homepage a11y, healthz route) as a canary. Without it, the e2e CI job fails because Playwright errors on 0 specs found — `continue-on-error: true` would have masked it but the failure would obscure real flake later. Smoke spec stays after the 5 real specs land — it's cheap, fast, and catches infrastructure regressions.
- ✅ **CI workflow restructured.** All 4 jobs (detect, lint-test-build, e2e, lighthouse) now on Node 24 + checkout@v6 + setup-node@v6 + pnpm/action-setup@v5. E2E job has matrix (chromium + webkit, fail-fast: false) + 2 upload-artifact steps (report always, test-results on failure) + temporary `continue-on-error: true` with TODO marker.
- ✅ **All quality gates pass:** lint (0 warnings), typecheck (clean), vitest (37/37 — story said 21 but Story 2.5 added more between draft and now; no regression on existing tests), build (success in 5m13s, 17 routes). `pnpm-lock.yaml` diff clean (+60/-2 lines, all Playwright/axe-related).
- ✅ **`engines.node` policy: kept at `>=22.0.0`** per story decision. Devs can run Node 22 or 24 locally; CI pins 24. No package.json change needed.
- ✅ **2.5-INFRA-001 effectively resolved 1 month ahead of 2026-06-02 deadline.** PO can mark as done in `*close-story` once Tasks 3-7 and 11 also land.
- ✅ **CodeRabbit pre-commit review NOT YET RUN.** Per story-completion checklist, CodeRabbit runs before "Ready for Review" — but this story is `InProgress`, not complete. Self-healing CodeRabbit pass deferred to end of Phase 2 (after all 11 tasks done).
- ⚠️ **Pause point handoff to Founder + @devops:**
  - Founder needs to resolve `PREREQ-TEST-USER`: create `e2e+test@softhair.com` in `softhair-dev` with minimal salon (3 services + 2 professionals + 3 clients pre-seeded). Optional: SQL setup script will be authored as part of Task 2.2 once unblocked.
  - @devops needs to confirm `SUPABASE_SERVICE_ROLE_KEY` is set as a CI secret in GitHub Actions (will be needed by Task 2.2 seed fixture). Run `gh secret list` to verify.
- 📋 **`continue-on-error: true` in e2e job is intentional and time-boxed.** First merge → 1 week observation → remove. Tracked via the `# TODO(HARD.1 follow-up)` comment in `ci.yml` (greppable). Will become a backlog item at story close.
- 📋 **Phase 2 work unblocked once prereqs resolved:** Tasks 2.1 + 2.2 (auth + seed fixtures), Tasks 3-7 (5 specs + add `data-testid` to source where missing), Task 11 (CI smoke + backlog updates).

### File List

**Created — apps/web:**
- `apps/web/playwright.config.ts` — projects (chromium + webkit), webServer (CI: `next start`, local: `next dev`), retries (CI: 2, local: 0), trace + video retain-on-failure, timeout 60s
- `apps/web/e2e/fixtures/axe.ts` — `assertNoA11yViolations(page, options)` with WCAG 2.1 AA tags + configurable `failOnImpact` (default critical)
- `apps/web/e2e/fixtures/index.ts` — extended `test` from `@playwright/test/base` with `axe` fixture; placeholder comments for `auth` + `seed` (Tasks 2.1 + 2.2)
- `apps/web/e2e/smoke.spec.ts` — 3 canary tests (homepage lang, homepage a11y, healthz route)

**Modified — apps/web:**
- `apps/web/package.json` — added devDeps `@playwright/test@^1.59.1` + `@axe-core/playwright@^4.11.3`; added scripts `test:e2e` / `test:e2e:ui` / `test:e2e:debug`

**Modified — root:**
- `package.json` — added script `"test:e2e": "turbo run test:e2e"` (mirrors `test`/`build`/`lint` pattern)
- `turbo.json` — added `test:e2e` task (`dependsOn: ['^build']`, outputs include playwright-report + test-results)
- `pnpm-lock.yaml` — auto-updated (+60/-2 lines, Playwright + axe-core transitive deps only)
- `.gitignore` — added `playwright/.cache/` (other Playwright artifacts already covered)
- `README.md` — added `pnpm test:e2e` row to Scripts table with link to `docs/testing/e2e.md`

**Modified — `.github/workflows/`:**
- `.github/workflows/ci.yml` — full rewrite: action upgrades (checkout v4→v6, setup-node v4→v6 + node-version 22→24, pnpm/action-setup v4→v5, upload-artifact added at v7); e2e job matrix (chromium + webkit) + artifact uploads + `continue-on-error: true` (with TODO removal marker) + `playwright install --with-deps ${{ matrix.browser }}` step

**Created — docs:**
- `docs/testing/e2e.md` — full Playwright + axe-core reference (TL;DR, conventions, debugging, CI integration, gotchas)

**Modified — docs:**
- `docs/architecture.md` — added testing reference callout after Tech Stack table (1 line)

### Not implemented (deferred to Phase 2)

| Task | Reason | Unblock condition |
|---|---|---|
| 2.1 auth fixture | Blocked on PREREQ-TEST-USER | Founder creates `e2e+test@softhair.com` test user in softhair-dev |
| 2.2 seed fixture | Blocked on PREREQ-SUPABASE-SERVICE-ROLE | @devops confirms `SUPABASE_SERVICE_ROLE_KEY` in GitHub Actions secrets |
| 3 spec 1.5 (professional-crud) | Depends on 2.1 + 2.2 | After Phase 2 fixtures land |
| 4 spec 1.6 (service-crud) | Depends on 2.1 + 2.2 | After Phase 2 fixtures land |
| 5 spec 1.7 (dashboard-hoje) | Depends on 2.1 + 2.2 | After Phase 2 fixtures land |
| 6 spec 2.4 (self-booking) | Depends on 2.1 (login optional but seed needed for service catalog) + 2.2 | After Phase 2 fixtures land |
| 7 spec 2.5 (clients) | Depends on 2.1 + 2.2 | After Phase 2 fixtures land |
| 11 smoke run + backlog updates | Depends on all of above + @devops push | After Phase 2 specs all green in CI |
| CodeRabbit self-healing pass | Story-completion gate | After all 11 tasks done |

### Not implemented (deferred)

_(a listar se houver — escopo OUT-OF-SCOPE definido pelo handoff)_:
- Visual regression (Percy/Chromatic) — overkill para MVP
- Cross-browser além de Chromium + Webkit (Edge/Firefox em fase 2)
- Performance testing além do Lighthouse CI já existente
- Mobile device emulation profunda — viewport responsive padrão é suficiente

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-05-01 | 1.0 | Story criada via `*draft` consumindo handoff `po-to-sm-hardening-sprint-2026-04-29.yaml` | River (@sm) |
| 2026-05-01 | 1.1 | `*validate-story-draft` GO (10/10) — Status Draft → Ready. Decisões PO: (a) FLAG-NUMBERING resolvido APROVANDO `HARD.1` como cross-epic track; (b) FLAG-CONFIG-DRIFT (architectureSharded desync) registrado como item separado `MNT-CONFIG-001` no backlog, não bloqueia esta story. Ver `docs/qa/po-validation-HARD.1-2026-05-01.md` para report completo. | Pax (@po) |
| 2026-05-02 | 1.2 | `*develop` Phase 1 of 2 (parallel-safe scope) shipped. Status Ready → InProgress. Tasks 1, 2.3, 2.4, 2.5, 8, 9, 10 done. Tasks 2.1, 2.2, 3-7, 11 paused on `PREREQ-TEST-USER` (Founder) + `PREREQ-SUPABASE-SERVICE-ROLE` (@devops). Quality gates: lint ✅ / typecheck ✅ / vitest 37/37 (no regression) ✅ / build ✅ / smoke E2E 6/6 ✅. Action versions upgraded beyond handoff (v6/v7 instead of v5/v4 — story Task 9.1 anticipated drift). Added `apps/web/e2e/smoke.spec.ts` canary spec beyond original scope to validate pipeline end-to-end. CodeRabbit self-healing deferred to Phase 2 close. | Dex (@dev) |

## QA Results

_(será preenchido pelo @qa após review)_
