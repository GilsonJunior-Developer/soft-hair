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

## Story 2.4 — Client-Facing Self-Booking

Gate: `docs/qa/gates/2.4-client-self-booking.yml` (CONCERNS — merge-approved)

| ID | Severity | Priority | Status | Título | Owner |
|---|---|---|---|---|---|
| 2.4-PERF-001 | medium | P1 | open | `sendBookingConfirmation` bloqueia critical path do Server Action — slow Resend degrada UX ≤60s AC. Mover para fire-and-forget ou Edge Function quando Resend for wired em prod | @dev |
| 2.4-TEST-001 | medium | P1 | open | Unit tests (pgTAP para availability algorithm + vitest para email wrapper) + E2E Playwright `self-booking.spec.ts` com timing ≤60s. **Pareado com 1.5/1.6/1.7-TEST-001** — setup único Playwright cobre todas | @dev |
| 2.4-SEC-001 | low | P1 | open | `cancel_token` no URL de sucesso expõe `client_name + client_email` via `get_public_booking` se URL for compartilhada publicamente. **Resolvido automaticamente pela Story 2.7** (signed short-links substituem o scheme de token) — bloqueia/depende dela | @dev |
| 2.4-DATA-001 | low | P2 | open | LGPD consent storage sem `lgpd_consent_version` column — hash antigo fica órfão se copy mudar. Phase 2: adicionar coluna de versão + `audit_log` append-only para trilha completa | @data-engineer |
| 2.4-A11Y-001 | low | P2 | open | Checkbox LGPD é 16×16px (abaixo WCAG 2.5.5 44×44). Mitigado por `<label>` clickable; revisitar só se houver relato de misclick | @dev |
| 2.4-A11Y-002 | low | P2 | open | `DayStrip` usa `role="tablist"`/`role="tab"` sem suporte a navegação por arrow-keys. Implementar handlers OU demover role para plain buttons | @dev |
| 2.4-OBS-001 | low | P2 | open | Analytics `booking_completed` é `console.info` only (aceitável por AC9). Wire PostHog/Segment quando stack de analytics for decidida | @dev |

---

## Resumo agregado

| Categoria | Abertos | Escalated | Done | Total |
|---|---|---|---|---|
| TEST | 7 | 0 | 0 | 7 |
| PERF | 1 | 1 | 1 | 3 |
| REQ | 4 | 0 | 0 | 4 |
| MNT | 1 | 0 | 0 | 1 |
| DOC | 1 | 0 | 0 | 1 |
| SEC | 1 | 0 | 0 | 1 |
| DATA | 1 | 0 | 0 | 1 |
| A11Y | 2 | 0 | 0 | 2 |
| OBS | 1 | 0 | 0 | 1 |
| **Total** | **19** | **1** | **1** | **21** |

### Itens pareados (setup único resolve múltiplos)

- **Playwright E2E runner setup:** 1.5-TEST-001 + 1.6-TEST-001 + 1.7-TEST-001 + **2.4-TEST-001** — um único sprint de hardening cobre 4 stories
- **axe-core automated a11y:** 1.7-TEST-002 — par natural com Playwright setup acima (expandir para cobrir `/book` + `/book/success` da 2.4)
- **Photo upload UI:** 1.5-REQ-001 + 1.5-REQ-002 — resize client-side + Server Action são uma entrega unificada

### Dependências entre stories

- **2.4-SEC-001 → Story 2.7** — signed short-link da 2.7 naturalmente resolve o URL-leak do `cancel_token` da 2.4; item fecha quando 2.7 mergear
- **2.4-PERF-001 → infra email** — quando Resend estiver wired em prod, medir latência real antes de decidir entre fire-and-forget vs Edge Function

## Priorização recomendada

**P0 — antes do próximo ship:**
- 1.7-PERF-002 — ✅ entregue em PR #19 (Lighthouse CI gate ativo). Item permanece marcado como `escalated` até o backlog ser refatorado para indicar cobertura; sem bloqueio atual.

**P1 — próximo sprint de hardening:**
- 1.6-TEST-001 + 1.7-TEST-001 + 1.7-TEST-002 + **2.4-TEST-001** — setup único de Playwright + axe-core cobre as 4 stories de uma vez (máxima economia de configuração)
- **2.4-PERF-001** — move email off critical path (pareia com o momento em que Resend for wired em prod)
- **2.4-SEC-001** — resolve-se automático com a entrega da Story 2.7 (token hardening)
- 1.7-REQ-001 — smoke PWA (Founder, low effort)

**P2 — backlog geral:**
- 1.6-TEST-002, 1.6-REQ-001 — valor incremental, não-urgente
- 2.4-DATA-001, 2.4-A11Y-001, 2.4-A11Y-002, 2.4-OBS-001 — polimento pós-MVP

---

## Histórico

| Data | Evento | Autor |
|---|---|---|
| 2026-04-23 | Backlog criado — consolidando tech debt de stories 1.6 + 1.7 após QA gates CONCERNS | Quinn (QA) |
| 2026-04-23 | 1.7-PERF-002 escalado para @devops via handoff (Lighthouse CI gate pré-merge) | Quinn (QA) |
| 2026-04-23 | Story 1.5 adicionada ao backlog — 6 itens (REQ-001/002, TEST-001/002, MNT-001, DOC-001) após gate CONCERNS | Quinn (QA) |
| 2026-04-24 | Story 2.4 adicionada ao backlog — 7 itens (PERF-001, TEST-001, SEC-001, DATA-001, A11Y-001/002, OBS-001) após gate CONCERNS (merge-approved). 2.4-SEC-001 linkado como dependência inversa da Story 2.7. | Pax (PO) |
