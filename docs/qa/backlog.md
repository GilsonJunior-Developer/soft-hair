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
| 1.5-TEST-001 | medium | P1 | open | AC7 WAIVED — E2E Playwright `apps/web/e2e/professional-crud.spec.ts`. **Pareado com 1.6-TEST-001 + 1.7-TEST-001** — setup único cobre 4 stories. | @dev |
| 1.5-TEST-002 | low | P2 | open | Vitest unit tests para server actions em `profissionais/actions.ts` (slug regex, commission edges, specialties maxLen, TOCTOU) | @dev |
| 1.5-MNT-001 | low | P2 | open | TOCTOU em limit 1-20 profissionais (COUNT+INSERT não-atômico) — CHECK constraint via trigger ou advisory lock para Phase 2 | @data-engineer |
| 1.5-DOC-001 | low | P2 | open | Task 1.3 — documentar bucket `professional-photos` config em `packages/db/README.md` | @dev |

---

## Story 1.6 — Service Catalog Customization

Gate: `docs/qa/gates/1.6-service-catalog-customization.yml` (CONCERNS)

| ID | Severity | Priority | Status | Título | Owner |
|---|---|---|---|---|---|
| 1.6-TEST-001 | medium | P1 | open | E2E CRUD test `apps/web/e2e/service-crud.spec.ts` (Playwright) — adiado para Fase 2 até runner E2E configurado | @dev |
| 1.6-TEST-002 | low | P2 | open | Vitest unit tests para server actions em `servicos/actions.ts` (edge cases: duration 14/15/480/481, commission 0/100/101) | @dev |
| 1.6-REQ-001 | low | P2 | open | Formalizar processo de WAIVED — deferral de AC durante implementação deve passar por @po via waiver (active: true, approved_by) antes de InReview | @po |

---

## Story 1.7 — Empty Dashboard Hoje

Gate: `docs/qa/gates/1.7-empty-dashboard-hoje.yml` (CONCERNS)

| ID | Severity | Priority | Status | Título | Owner |
|---|---|---|---|---|---|
| 1.7-TEST-001 | medium | P1 | open | Playwright E2E `dashboard-hoje.spec.ts` (Chromium + Webkit) — adiado para Fase 2 | @dev |
| 1.7-TEST-002 | medium | P1 | open | axe-core automated a11y audit (0 violations target) — par com TEST-001 no mesmo setup E2E | @dev |
| 1.7-PERF-001 | high | — | done | INP 1.440ms no click da agenda — RESOLVIDO via PR #11 (startTransition + React.memo + Realtime debounce ≥600ms + requestIdleCallback) | @dev |
| 1.7-PERF-002 | high | P0 | escalated | Amarrar Lighthouse CI como gate pré-merge (Performance ≥ 85 mobile + Accessibility ≥ 95) — sucessor de processo do PERF-001. Handoff: `.aiox/handoffs/qa-to-devops-lighthouse-ci-gate-2026-04-23.yaml` | @devops |
| 1.7-REQ-001 | low | P1 | open | Smoke test manual de PWA install em iOS Safari + Android Chrome (device real) — pendente confirmação do Founder | Founder |

---

## Resumo agregado

| Categoria | Abertos | Escalated | Done | Total |
|---|---|---|---|---|
| TEST | 6 | 0 | 0 | 6 |
| PERF | 0 | 1 | 1 | 2 |
| REQ | 4 | 0 | 0 | 4 |
| MNT | 1 | 0 | 0 | 1 |
| DOC | 1 | 0 | 0 | 1 |
| **Total** | **12** | **1** | **1** | **14** |

### Itens pareados (setup único resolve múltiplos)

- **Playwright E2E runner setup:** 1.5-TEST-001 + 1.6-TEST-001 + 1.7-TEST-001 — um único sprint de hardening cobre 3 stories
- **axe-core automated a11y:** 1.7-TEST-002 — par natural com Playwright setup acima
- **Photo upload UI:** 1.5-REQ-001 + 1.5-REQ-002 — resize client-side + Server Action são uma entrega unificada

## Priorização recomendada

**P0 — antes do próximo ship:**
- 1.7-PERF-002 — Lighthouse CI gate (@devops) — fecha a lacuna de processo que causou o incidente INP

**P1 — próximo sprint de hardening:**
- 1.6-TEST-001, 1.7-TEST-001, 1.7-TEST-002 — setup único de Playwright + axe-core cobre as três de uma vez (economia de configuração)
- 1.7-REQ-001 — smoke PWA (Founder, low effort)

**P2 — backlog geral:**
- 1.6-TEST-002, 1.6-REQ-001 — valor incremental, não-urgente

---

## Histórico

| Data | Evento | Autor |
|---|---|---|
| 2026-04-23 | Backlog criado — consolidando tech debt de stories 1.6 + 1.7 após QA gates CONCERNS | Quinn (QA) |
| 2026-04-23 | 1.7-PERF-002 escalado para @devops via handoff (Lighthouse CI gate pré-merge) | Quinn (QA) |
| 2026-04-23 | Story 1.5 adicionada ao backlog — 6 itens (REQ-001/002, TEST-001/002, MNT-001, DOC-001) após gate CONCERNS | Quinn (QA) |
