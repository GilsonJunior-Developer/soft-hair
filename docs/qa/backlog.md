# QA Tech Debt Backlog

> Índice único de itens de débito técnico identificados em gates QA com verdict CONCERNS/WAIVED.
> Cada item tem origem rastreável em `docs/qa/gates/{story}.yml` e é candidato a entrar em sprint de manutenção ou fase de hardening pós-MVP.

**Convenção:**
- `id` — prefixo por categoria (`TEST-`, `PERF-`, `REQ-`, `SEC-`, `MNT-`, `ARCH-`, `DOC-`) + número sequencial por story
- `severity` — `low` | `medium` | `high` (mesma escala dos gates)
- `priority` — `P0` (bloqueante próxima entrega) | `P1` (próximo sprint) | `P2` (backlog geral)
- `status` — `open` | `in_progress` | `done` | `wontfix`

---

## Story 1.5 — Professional Profile Setup

Gate: `docs/qa/gates/1.5-professional-profile-setup.yml` (CONCERNS)

| ID | Severity | Priority | Status | Título | Owner |
|---|---|---|---|---|---|
| 1.5-REQ-001 | medium | P1 | open | AC2 parcial — UI de upload de foto + `uploadProfessionalPhoto` Server Action (Tasks 3.4 + 5.5 deferidos). Par com REQ-002. | @dev |
| 1.5-REQ-002 | low | P2 | open | AC6 — client-side resize via browser-image-compression complementar ao guard server-side (bucket já enforça 512KB + MIME whitelist). Par com REQ-001. | @dev |
| 1.5-TEST-001 | medium | **P0** | open | AC7 WAIVED — E2E Playwright `apps/web/e2e/professional-crud.spec.ts`. **Promovido P1→P0 em 2026-04-29** pela decisão Founder de fazer hardening sprint antes de Epic 3. Pareado com 1.6/1.7/2.4/2.5-TEST-001 — setup único cobre 5 stories. | @dev |
| 1.5-TEST-002 | low | P2 | open | Vitest unit tests para server actions em `profissionais/actions.ts` (slug regex, commission edges, specialties maxLen, TOCTOU) | @dev |
| 1.5-MNT-001 | low | P2 | open | TOCTOU em limit 1-20 profissionais (COUNT+INSERT não-atômico) — CHECK constraint via trigger ou advisory lock para Phase 2 | @data-engineer |
| 1.5-DOC-001 | low | P2 | open | Task 1.3 — documentar bucket `professional-photos` config em `packages/db/README.md` | @dev |

---

## Story 1.6 — Service Catalog Customization

Gate: `docs/qa/gates/1.6-service-catalog-customization.yml` (CONCERNS)

| ID | Severity | Priority | Status | Título | Owner |
|---|---|---|---|---|---|
| 1.6-TEST-001 | medium | **P0** | open | E2E CRUD test `apps/web/e2e/service-crud.spec.ts` (Playwright) — **Promovido P1→P0 em 2026-04-29** pela decisão Founder. Pareado com 1.5/1.7/2.4/2.5-TEST-001 (setup único). | @dev |
| 1.6-TEST-002 | low | P2 | open | Vitest unit tests para server actions em `servicos/actions.ts` (edge cases: duration 14/15/480/481, commission 0/100/101) | @dev |
| 1.6-REQ-001 | low | P2 | open | Formalizar processo de WAIVED — deferral de AC durante implementação deve passar por @po via waiver (active: true, approved_by) antes de InReview | @po |

---

## Story 1.7 — Empty Dashboard Hoje

Gate: `docs/qa/gates/1.7-empty-dashboard-hoje.yml` (CONCERNS)

| ID | Severity | Priority | Status | Título | Owner |
|---|---|---|---|---|---|
| 1.7-TEST-001 | medium | **P0** | open | Playwright E2E `dashboard-hoje.spec.ts` (Chromium + Webkit) — **Promovido P1→P0 em 2026-04-29** pela decisão Founder. Pareado com 1.5/1.6/2.4/2.5-TEST-001. | @dev |
| 1.7-TEST-002 | medium | **P0** | open | axe-core automated a11y audit (0 violations target) — par natural com TEST-001 no mesmo setup. **Promovido P1→P0 em 2026-04-29** pela decisão Founder. | @dev |
| 1.7-PERF-001 | high | — | done | INP 1.440ms no click da agenda — RESOLVIDO via PR #11 (startTransition + React.memo + Realtime debounce ≥600ms + requestIdleCallback) | @dev |
| 1.7-PERF-002 | high | P0 | escalated | Amarrar Lighthouse CI como gate pré-merge (Performance ≥ 85 mobile + Accessibility ≥ 95) — sucessor de processo do PERF-001. Handoff: `.aiox/handoffs/qa-to-devops-lighthouse-ci-gate-2026-04-23.yaml` | @devops |
| 1.7-REQ-001 | low | P1 | open | Smoke test manual de PWA install em iOS Safari + Android Chrome (device real) — pendente confirmação do Founder | Founder |

---

## Story 2.4 — Client-Facing Self-Booking

Gate: `docs/qa/gates/2.4-client-self-booking.yml` (CONCERNS — merge-approved)

| ID | Severity | Priority | Status | Título | Owner |
|---|---|---|---|---|---|
| 2.4-PERF-001 | medium | P1 | open | `sendBookingConfirmation` bloqueia critical path do Server Action — slow Resend degrada UX ≤60s AC. Mover para fire-and-forget ou Edge Function quando Resend for wired em prod | @dev |
| 2.4-TEST-001 | medium | **P0** | open | Unit tests (pgTAP para availability algorithm + vitest para email wrapper) + E2E Playwright `self-booking.spec.ts` com timing ≤60s. **Promovido P1→P0 em 2026-04-29** pela decisão Founder. Pareado com 1.5/1.6/1.7/2.5-TEST-001 — setup único Playwright cobre todas | @dev |
| 2.4-SEC-001 | low | — | **done** | `cancel_token` no URL de sucesso expõe `client_name + client_email` via `get_public_booking`. **RESOLVIDO pela Story 2.7 (gate Quinn 2026-04-25)** — JWT em path substitui cancel_token-em-searchParam (web) + REVOKE EXECUTE FROM PUBLIC em `get_public_booking` (DB). Verificado em prod via `has_function_privilege('anon','public.get_public_booking','EXECUTE')=false` | @qa |
| 2.4-DATA-001 | low | P2 | open | LGPD consent storage sem `lgpd_consent_version` column — hash antigo fica órfão se copy mudar. Phase 2: adicionar coluna de versão + `audit_log` append-only para trilha completa | @data-engineer |
| 2.4-A11Y-001 | low | P2 | open | Checkbox LGPD é 16×16px (abaixo WCAG 2.5.5 44×44). Mitigado por `<label>` clickable; revisitar só se houver relato de misclick | @dev |
| 2.4-A11Y-002 | low | P2 | open | `DayStrip` usa `role="tablist"`/`role="tab"` sem suporte a navegação por arrow-keys. Implementar handlers OU demover role para plain buttons | @dev |
| 2.4-OBS-001 | low | P2 | open | Analytics `booking_completed` é `console.info` only (aceitável por AC9). Wire PostHog/Segment quando stack de analytics for decidida | @dev |

---

## Story 2.5 — Client History & Profile

Gate: `docs/qa/gates/2.5-client-history.yml` (CONCERNS — deploy-condition resolved 2026-04-29)

| ID | Severity | Priority | Status | Título | Owner |
|---|---|---|---|---|---|
| 2.5-PERF-001 | medium | P1 | open | In-memory aggregation em `/clientes` fetcha todos clients do salão antes de paginate (Dev Notes sanciona até "few thousand clients"). Threshold ~5000. Quando hit: criar view `clients_with_stats` com `security_invoker = true` (mesmo padrão de `20260423000001_public_views_invoker_mode.sql`). Adicionar logging quando salon > 2000 clients pra observabilidade | @dev |
| 2.5-TYPES-001 | low | P2 | open | `packages/db/types/database.ts` patcheado manualmente pra `appointments.notes`. Regen completa via Supabase CLI deferida pra início de Epic 3 (WhatsApp tables vão precisar) | @dev |
| 2.5-A11Y-001 | low | P2 | open | NotesEditor toggle button hardcoda `aria-expanded="false"` (botão é desmontado quando editor abre). Refactor opcional: render sempre + toggle visibility com aria-expanded reativo | @dev |
| 2.5-TEST-001 | low | **P0** | open | E2E Playwright (lista→search→detail→notes-edit→soft-delete). **Promovido P2→P0 em 2026-04-29** pela decisão Founder de fazer hardening sprint antes de Epic 3. Pareado com 1.5/1.6/1.7/2.4-TEST-001 — setup único cobre 5 stories. | @dev |
| 2.5-MNT-001 | low | P2 | open | `setTimeout` em `notes-editor.tsx:40` (clear "Salvo ✓" indicator) não é cleared on unmount. Memory leak teórico em rapid mount/unmount; negligível em prática mas fácil de fixar com useEffect cleanup ou ref-tracked timer | @dev |
| 2.5-VAL-001 | low | P2 | open | Server actions (softDeleteClient, updateAppointmentNotes) não pre-validam UUID format nos input ids. Postgres rejeita com type error genérico. Adicionar `z.string().uuid()` daria error message mais limpa | @dev |
| 2.5-MNT-002 | low | P2 | open | 2 branches locais antigas sobraram após operações pré-Story 2.5: `chore/story-2.5-refresh`, `chore/story-2.7-refresh`. Aplicar `gage *cleanup` quando conveniente | @devops |
| 2.5-INFRA-001 | medium | **P0** | open | GitHub Actions warns que `actions/checkout@v4`, `actions/setup-node@v4`, `pnpm/action-setup@v4` usam Node.js 20 deprecated. Forced-Node-24 starting **2026-06-02**. **Promovido P1→P0 em 2026-04-29** pela decisão Founder — pareia com hardening sprint (deadline driven, não pode escapar). Atualizar workflows antes do deadline | @devops |

---

## Resumo agregado

| Categoria | Abertos | Escalated | Done | Total |
|---|---|---|---|---|
| TEST | 8 | 0 | 0 | 8 |
| PERF | 2 | 1 | 1 | 4 |
| REQ | 4 | 0 | 0 | 4 |
| MNT | 3 | 0 | 0 | 3 |
| DOC | 1 | 0 | 0 | 1 |
| SEC | 0 | 0 | 1 | 1 |
| DATA | 1 | 0 | 0 | 1 |
| A11Y | 3 | 0 | 0 | 3 |
| OBS | 1 | 0 | 0 | 1 |
| TYPES | 1 | 0 | 0 | 1 |
| VAL | 1 | 0 | 0 | 1 |
| INFRA | 1 | 0 | 0 | 1 |
| **Total** | **26** | **1** | **2** | **29** |

### Itens pareados (setup único resolve múltiplos)

- **Playwright E2E runner setup:** 1.5-TEST-001 + 1.6-TEST-001 + 1.7-TEST-001 + **2.4-TEST-001** + **2.5-TEST-001** — um único sprint de hardening cobre **5 stories** (Epic 1 + Epic 2 inteiros)
- **axe-core automated a11y:** 1.7-TEST-002 — par natural com Playwright setup acima (expandir para cobrir `/book` + `/book/success` da 2.4)
- **Photo upload UI:** 1.5-REQ-001 + 1.5-REQ-002 — resize client-side + Server Action são uma entrega unificada

### Dependências entre stories

- **2.4-SEC-001 → Story 2.7** — signed short-link da 2.7 naturalmente resolve o URL-leak do `cancel_token` da 2.4; item fecha quando 2.7 mergear
- **2.4-PERF-001 → infra email** — quando Resend estiver wired em prod, medir latência real antes de decidir entre fire-and-forget vs Edge Function

## Priorização recomendada

**P0 — Hardening Sprint pré-Epic 3 (decisão Founder 2026-04-29):**
Conjunto coeso pra um sprint único de hardening:
- **1.5-TEST-001** + **1.6-TEST-001** + **1.7-TEST-001** + **1.7-TEST-002** + **2.4-TEST-001** + **2.5-TEST-001** — setup único Playwright + axe-core cobre **5 stories** (Epic 1 e 2 inteiros). Justificativa: Epic 2 fechou 100% sem cobertura E2E; memory documenta regressões "indetectáveis em manual" (Zod 4 datetime, REVOKE PUBLIC bug) só pegas em DB validation pós-apply ou hotfix same-day. E2E é a próxima camada lógica.
- **2.5-INFRA-001** — atualizar workflows GitHub Actions antes de **2026-06-02** (Node 20 → Node 24 forçado). Deadline-driven, pareia naturalmente com o sprint de hardening.
- 1.7-PERF-002 — ✅ entregue em PR #19 (Lighthouse CI gate ativo). Item permanece marcado como `escalated` até o backlog ser refatorado para indicar cobertura; sem bloqueio atual.

**P1 — próximo sprint geral:**
- **2.4-PERF-001** — move email off critical path (pareia com o momento em que Resend for wired em prod)
- **2.5-PERF-001** — view server-side pra aggregation quando salões cruzarem 5k clients (hoje o maior parceiro tem ~50, longe do threshold)
- ~~**2.4-SEC-001**~~ ✅ **DONE 2026-04-25** — resolvido pela Story 2.7 + REVOKE FROM PUBLIC no DB (Quinn gate empiricamente verifica)
- 1.7-REQ-001 — smoke PWA (Founder, low effort)

**P2 — backlog geral:**
- 1.6-TEST-002, 1.6-REQ-001 — valor incremental, não-urgente
- 2.4-DATA-001, 2.4-A11Y-001, 2.4-A11Y-002, 2.4-OBS-001 — polimento pós-MVP
- 2.5-TYPES-001, 2.5-A11Y-001, 2.5-MNT-001, 2.5-MNT-002, 2.5-VAL-001 — polimento Story 2.5 (types regen, aria-expanded refinement, setTimeout cleanup, branch cleanup, UUID pre-validation)

---

## Histórico

| Data | Evento | Autor |
|---|---|---|
| 2026-04-23 | Backlog criado — consolidando tech debt de stories 1.6 + 1.7 após QA gates CONCERNS | Quinn (QA) |
| 2026-04-23 | 1.7-PERF-002 escalado para @devops via handoff (Lighthouse CI gate pré-merge) | Quinn (QA) |
| 2026-04-23 | Story 1.5 adicionada ao backlog — 6 itens (REQ-001/002, TEST-001/002, MNT-001, DOC-001) após gate CONCERNS | Quinn (QA) |
| 2026-04-24 | Story 2.4 adicionada ao backlog — 7 itens (PERF-001, TEST-001, SEC-001, DATA-001, A11Y-001/002, OBS-001) após gate CONCERNS (merge-approved). 2.4-SEC-001 linkado como dependência inversa da Story 2.7. | Pax (PO) |
| 2026-04-24 | Hotfix PR #24 (`c00dc2a`) mergeado same-day — Zod 4 `.datetime()` rejeitava offset `+00:00` de PostgREST. Reforça priorização do 2.4-TEST-001. | Pax (PO) |
| 2026-04-25 | **2.4-SEC-001 → done** via gate Quinn na Story 2.7. JWT em path substitui cancel_token-em-searchParam (web) + REVOKE EXECUTE FROM PUBLIC em `get_public_booking` (DB). Verificado empiricamente em prod via `has_function_privilege('anon','public.get_public_booking','EXECUTE')=false`. Critério de fechamento da Pax (2.4 v1.1) satisfeito. | Quinn (QA) |
| 2026-04-25 | Story 2.7 mergeada (PR #26 / `5d601b4`). Cycle limpo (zero hotfix) — primeiras stories desde a 2.4 que se beneficiou de memory acumulada (Zod 4 datetime aplicado preventivamente). 2.4-SEC-001 → done confirmado neste merge (3-layer: web + DB + código). Epic 2 = 6/7 (86%). Próxima e última: 2.5 Client History. | Pax (PO) |
| 2026-04-29 | Story 2.5 mergeada (PR #28 / `cb76a59`). Cycle multi-agente: Pax (re-validate) → River (SF-001 fix) → Dex (Tasks 1/2/3/5/7) → Dex HALT (schema gap) → Dara (migration `20260427000000` em dev+prod) → Dex resume (Tasks 4/6) → Quinn (gate CONCERNS) → Gage (prod migration ANTES do push, 5/5 CI verde, squash merge). 8 itens novos no backlog (1 P1 medium PERF + 1 P1 medium INFRA com deadline 2026-06-02 + 6 P2 polish). **Epic 2 = 7/7 = 100% done.** | Pax (PO) |
| 2026-04-29 | **Decisão Founder pós-Epic 2:** promover hardening sprint antes de Epic 3. 7 itens P1/P2 → **P0**: 1.5/1.6/1.7/2.4/2.5-TEST-001 (E2E Playwright cobrindo 5 stories), 1.7-TEST-002 (axe-core par natural), 2.5-INFRA-001 (Node 20 deprecation deadline 2026-06-02). Setup único Playwright + axe-core + workflows update. Próximo passo: @sm draft hardening story (handoff `po-to-sm-hardening-sprint-2026-04-29.yaml`). | Pax (PO) |
