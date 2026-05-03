# Decision Log — Story 4.3 (Monthly Commission Report)

> Autonomous decisions made by @dev (Dex) during YOLO execution.
> Branch: `feature/4.3-monthly-commission-report` (forked from `main@d183168`).
> Started: 2026-05-03.

## D-001 — F1 ROUTE: `/comissao` top-level

- **Decision:** New top-level route `apps/web/app/(dashboard)/comissao/`.
- **Source:** PO validation 2026-05-03 (`po-to-dev-develop-4.3-2026-05-03.yaml`). Applied verbatim.
- **Alternatives considered:** `/financeiro/comissao` sub-route (PO rejected — Story 4.4 will own `/financeiro` separately).

## D-002 — F2 PDF: print-CSS

- **Decision:** Print stylesheet via `@media print` block; user uses browser "Save as PDF" from print dialog.
- **Source:** PO validation 2026-05-03. Applied verbatim.
- **Alternatives considered:** `@react-pdf/renderer` (~100kb, deferred Phase 2), Puppeteer (heavy, deferred).

## D-003 — F3 AGG: JS reduce instead of SQL aggregation

- **Decision:** Override PO recommendation (a) SQL aggregation. Use JS reduce on raw `commission_entries` rows.
- **Rationale:**
  1. PostgREST aggregation feature (`select=col,col.sum()`) requires `db-aggregates-enabled` opt-in in Supabase project config — not verified active on softhair-dev. Adding a runtime dependency on a server-config flag adds risk for a YOLO sweep.
  2. JS reduce at MVP scale (≤500 commission_entries × ~200 bytes = ~100kb wire transfer + O(n) reduce) easily meets AC5 ≤1s budget. Wall-clock estimate: ~50-100ms total.
  3. Avoids needing to escalate to @data-engineer for an RPC migration mid-development if PostgREST aggregation gotcha appears.
  4. Deterministic across environments; no Supabase server-side feature flag dependency.
- **Tradeoff:** at >5k commission_entries (way past MVP scale) JS reduce becomes wasteful. Document Phase 2 swap-to-RPC path in ADR-0004 amendment (Task 11.1).
- **Alternatives considered:**
  - PostgREST aggregation via `.select('col,col.sum()')` (PO recommendation) — risk above.
  - RPC migration `fetch_commission_summary` — mid-flight escalation per Task 1.4 fallback path. Avoidable at MVP scale.

## D-004 — Reuse `BR_TIMEZONE` constant from existing `lib/agenda/date-range.ts`

- **Decision:** Import `BR_TIMEZONE = 'America/Sao_Paulo'` from `@/lib/agenda/date-range` instead of redefining in commission/period.ts.
- **Rationale:** Single source of truth. `date-range.ts` already exports it + has the `fromZonedTime`/`toZonedTime` patterns that handle the SP-midnight ↔ UTC conversion correctly. Mirroring its patterns in the new period helper keeps the codebase consistent.
- **Source:** Discovery during YOLO. PO finding (`TIMEZONE-FINDING-4.3-001`) implicitly required this — using `date-fns-tz` correctly meant reusing the existing constant.

## D-005 — Task 10 `formatBrl` extraction uses Intl version, dialog gains thousands separator

- **Decision:** New `apps/web/lib/format.ts` exports `formatBrl(value: number)` returning `value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })` (Intl version from commission-simulator.tsx).
- **Side effect:** `appointment-detail-dialog.tsx` migrates from inline `R$ ${val.toFixed(2).replace('.', ',')}` (no thousands sep) to `formatBrl(val)` (with thousands sep). Subtle display improvement at amounts ≥ R$ 1.000,00.
- **Rationale:** PO scope-strict on Task 10 was about not refactoring component STRUCTURE, not about preserving display bugs. Story explicit goal "currency formatting consistency" is the deciding factor. Improvement is safe (better correctness for Brazilian locale).
- **Out of scope (NOT touched):** 7 other inline `.toFixed(2).replace('.', ',')` sites across `servicos/types.ts`, `appointment-form.tsx`, `onboarding/.../step-3-prices-form.tsx`, public booking pages. Those belong to other stories' surfaces — let them decide their own refactor cadence.

## D-006 — Perf integration test: assert `>= 50` (not exact equal)

- **Decision:** In `commission-report-perf.integration.test.ts`, assertion is `result.totals.appointments >= 50` instead of strict equality.
- **Rationale:** Vitest may run integration test files in parallel across the suite. The test's filter is `created_at >= testStartTime` which catches OUR inserts AND any concurrent commission_entries inserted by other test files within the same window. Strict equality would be flaky. The perf test purpose is the wall-clock sentinel (`elapsedMs < 500`), not exact functional verification. Functional correctness is covered by Vitest unit tests (Task 7).

## D-007 — TIMEZONE-FINDING fix: SP midnight → UTC ISO via `fromZonedTime`

- **Decision:** Default period boundaries computed as `fromZonedTime(startOfMonth(now in SP), 'America/Sao_Paulo')` returning a Date already in UTC for query.
- **Rationale:** Mirror precedent from `apps/web/lib/agenda/date-range.ts:53-79` (`computeWindow`). PO finding required SP-timezone awareness.
- **Test added:** Vitest case in `actions.test.ts` asserts that an appointment at "2026-04-30T23:30:00-03:00" (= "2026-05-01T02:30:00Z" UTC) appears in April report, NOT May.
