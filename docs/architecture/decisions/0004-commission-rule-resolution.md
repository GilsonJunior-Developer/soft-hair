# ADR-0004 — Commission rule resolution & history immutability

**Status:** ACCEPTED
**Date:** 2026-05-02
**Story:** 4.1 Commission Rule Engine
**Authors:** @sm (River) + @po (Pax) decisions; implementation @dev (Dex)

## Context

Story 4.1 ships the commission rule engine for the salon owner to configure how
each professional is paid per service. Two PRD acceptance criteria are
intertwined and required disambiguation:

- **AC1**: professional has 2 modes — `PERCENT_FIXED` or `TABLE` (per-service
  overrides).
- **AC2**: a service can carry an override that wins over the professional's
  default.

Schema state at story start (verified via Supabase MCP `list_tables` 2026-05-02):

- `professionals.commission_mode` enum already shipped in Story 1.1.
- `professionals.commission_default_percent` already shipped (default 40).
- `services.commission_override_percent` already shipped + persisted by Story
  1.6's service form.
- `commission_entries` table existed (RLS enabled) with snapshot fields
  (`percent_applied`, `commission_amount_brl`, `service_price_brl`).
- **Gap:** `TABLE` mode had no backing data — radio in Story 1.5's professional
  form was inert.

Additionally, AC5 mandates that commission rule edits **must not** retroactively
recalculate already-recorded commissions.

## Decision

### 1. New table `professional_service_commissions`

Per-professional × per-service rate matrix. Active only when
`professionals.commission_mode = 'TABLE'`.

```
(salon_id, professional_id, service_id, percent NUMERIC(5,2), …)
UNIQUE (professional_id, service_id)
```

RLS in parity with `professionals_all` / `services_all` policies (FOR ALL
gated by `current_user_salon_ids()`). Application layer enforces role gating
(only OWNER/RECEPTIONIST writes).

### 2. Three-tier resolution precedence

```
Tier 1: TABLE_ENTRY            (mode='TABLE' AND entry exists for prof×service)
Tier 2: SERVICE_OVERRIDE       (services.commission_override_percent IS NOT NULL)
Tier 3: PROFESSIONAL_DEFAULT   (professionals.commission_default_percent)
```

A `TABLE_ENTRY` of value `0` is meaningful — it represents an explicit "this
professional gets 0% on this service" decision, not a fallback. Same applies
to `SERVICE_OVERRIDE`. The engine differentiates `null` (fall through) from `0`
(applied).

### 3. Mode flip preserves dormant entries

When the owner flips a professional from `TABLE → PERCENT_FIXED`, the existing
`professional_service_commissions` rows are **kept dormant** in the DB, not
soft-deleted or purged. Engine ignores them when mode != TABLE. Owner can
flip back to TABLE and recover the prior matrix.

Rationale: data destruction without explicit consent violates the "no silent
loss" principle. Cost: a few orphaned rows per dormant professional, which is
trivial.

### 4. Engine architecture: pure functions, DB I/O in caller

```ts
resolveRate({ professional, service, tableEntry }) → { percentApplied, source }
calculateCommission({ servicePriceBrl, percentApplied }) → { commissionAmountBrl }
```

Both functions are synchronous, side-effect-free, and accept plain data
objects (not Supabase clients). Caller pre-fetches the three inputs and
invokes the engine. This matches the Repository Pattern from
`docs/architecture.md` line 162 and makes vitest tests trivial (no DB mocks).

### 5. Numeric precision: integer cents math

Calculation converts to integer cents before applying percent, then rounds:

```ts
const cents = Math.round(servicePriceBrl * 100)
const commissionCents = Math.round((cents * percent) / 100)
const commissionBrl = commissionCents / 100
```

This avoids float drift (e.g., `0.1 * 0.3 !== 0.03` in IEEE-754). Matches
NUMERIC(5,2) precision on the database side. Postgres column is
`commission_amount_brl NUMERIC(10,2)` so round-trip is exact.

### 6. Immutability invariant (AC5)

`commission_entries` is **insert-only** during operations triggered from the
rule editor. The engine NEVER emits `UPDATE` or `DELETE` against this table
when the owner edits a rule. CI guard: `grep -r 'UPDATE.*commission_entries'
apps/web/` must return zero matches.

When Story 4.2 wires the calculation to the `→ COMPLETED` status transition,
each new entry captures `percent_applied` and `commission_amount_brl` as
**snapshot values** — the historical record stands even if rules later change.

## Consequences

### Positive

- AC1(b) is fully expressive: per-prof × per-service rates support
  differentiated contracts (e.g., professional X 50% on cuts but 30% on
  coloring).
- AC5 is structurally enforced by separating "rule state" from "history
  ledger". A forgotten developer cannot accidentally violate immutability
  via an UPDATE.
- Engine is unit-testable without DB.
- Three-tier precedence is documented in jsdoc on `resolveRate` and reproduced
  in tests.

### Negative

- UI matrix risk: 5 professionals × 20 services = 100 inputs. Mitigated by
  progressive disclosure (collapsed-by-default panel) + bulk-set helper
  ("Aplicar X% a todos") + lazy entries (empty rows = fallback, not required).
- Dormant entries on mode flip: tiny storage overhead vs UX trade-off accepted.
- Engine separation requires caller to fetch 3 things; convenience wrapper
  could be added later if a clear repeat caller emerges.

### Neutral

- New table is the 17th table in `public` schema — no architectural pressure.

## Alternatives considered (and rejected)

### Interpretation B — TABLE mode reuses `services.commission_override_percent`

Rejected by @po in `*validate-story-draft 4.1` (2026-05-02). Would make TABLE
mode semantically equivalent to PERCENT_FIXED with a service override applied,
defeating the purpose of the AC1(b) mode distinction.

### Recompute on rule edit

Rejected because it violates AC5. Already-paid commissions can't be retroactively
adjusted without owner explicit consent — and even then it's a finance event,
not a config event.

### Decimal library (decimal.js)

Rejected because integer cents math suffices for a percent × BRL price domain
(values fit safely in Number). Adding a runtime dependency for this is overkill.

## References

- Story 4.1: `docs/stories/4.1.commission-rule-engine.md`
- PRD Epic 4: `docs/prd/epic-4-finance-commission-nfs-e.md` lines 7-54
- Schema migration: `supabase/migrations/20260502000000_story_4_1_professional_service_commissions.sql`
- @po validation handoff: `.aiox/handoffs/po-to-dev-develop-4.1-2026-05-02.yaml`
- Engine code: `apps/web/lib/commission/`
- Architecture monolithic: `docs/architecture.md` lines 86, 161-163

---

## Story 4.2 Implementation Notes (amended 2026-05-02)

Story 4.2 (Commission Calculation on Service Completion) is the **first writer** to `commission_entries`. The following decisions were made during 4.2 implementation, formalized here for traceability:

### Writer is Server Action, NOT plpgsql trigger or RPC extension

- **Decision:** Commission insertion happens in `apps/web/app/(dashboard)/agenda/actions.ts::calculateAndPersistCommission`, called inline at the end of `transitionAppointmentStatus` when the target status is `COMPLETED`.
- **Why:** Keeps the canonical engine (this ADR's `resolveRate` + `calculateCommission`) in JS. A plpgsql port would duplicate the math, lose vitest testability, and inflate the migration footprint.
- **Trade-off accepted:** The status transition (RPC) and commission insert are not in the same DB transaction. If the insert fails after the status change, we get a "ghost" appointment without a commission row. Recovery: the insert is idempotent (UNIQUE on `appointment_id` + `upsert(...{ignoreDuplicates:true})`), and structured logging makes gaps grep-able for future backfill.

### Idempotency strategy

- **Mechanism:** `INSERT ... ON CONFLICT (appointment_id) DO NOTHING` via supabase-js `.upsert(rows, { onConflict: 'appointment_id', ignoreDuplicates: true })`.
- **Guarantees:** Calling COMPLETED twice (e.g., user double-clicks) does NOT create a duplicate row. The first insert wins; subsequent attempts are no-ops.
- **AC5 alignment:** `ignoreDuplicates: true` means we never overwrite an existing commission_entry — even if the rule changed between attempts, the original snapshot stands.

### Transition vs commission boundary

- **Status update is authoritative.** If the commission insert fails (engine throw, DB error, missing inputs), `transitionAppointmentStatus` still returns `{ ok: true }`. The appointment is officially `COMPLETED` from the user's perspective; the commission row is derived data that can be reconciled later.
- **Structured logging mandatory:** every commission failure logs `console.error('[transitionAppointmentStatus][commission]', { appointmentId, reason })`. This was a mandatory caveat from @po validation 2026-05-02, designed to make divergences grep-able.
- **Future work:** if the failure mode bites in production, a backfill job could re-process appointments where `appointments.commission_calculated_brl IS NULL AND status = 'COMPLETED'`.

### Denormalized read field (`appointments.commission_calculated_brl`)

- **Why duplicated:** `commission_entries.commission_amount_brl` is the source of truth, but the agenda card read path benefits from a single-column lookup without JOIN. Story 4.2 writes BOTH locations atomically (in the same Server Action) on the COMPLETED transition.
- **AC5 still holds:** `appointments.commission_calculated_brl` is set ONCE per appointment lifecycle (at COMPLETED transition). No subsequent code path updates it. Verified by grep: `grep -rn 'commission_calculated_brl' apps/web/` shows only the single writer in `agenda/actions.ts` and read sites.

### `data_atendimento` mapping (PRD AC2)

PRD AC2 lists `data_atendimento` as a required field. **No new column was added.** Instead, the mapping resolves via JOIN: `commission_entries.appointment_id → appointments.scheduled_at`. The `appointments.scheduled_at` is the canonical "when the service was rendered" time (vs `commission_entries.created_at` which records when calc happened — those can differ if staff marks COMPLETED late). Story 4.3 monthly report will need this JOIN regardless for client name + service name; denormalizing into `commission_entries` would add maintenance cost without read benefit.

### Test coverage added in 4.2

- 14 new vitest scenarios in `apps/web/app/(dashboard)/agenda/actions.test.ts`:
  - 5 precedence permutations (PERCENT_FIXED + override; TABLE + entry; TABLE fallback to override; TABLE fallback to default)
  - AC4 discount path (price_brl_final used, not price_brl_original)
  - Idempotency (upsert + ignoreDuplicates flag verified)
  - Non-COMPLETED transitions skip commission flow
  - Engine fetch failure → structured log + transition still returns ok
  - Insert failure → structured log + transition still returns ok
  - RPC error → no commission flow at all
  - **AC5 immutability (rejection-grade behavioral test):** mock production code never exposes `update` for commission_entries; rule edit after COMPLETED does NOT trigger recompute (verified via second invalid_transition call).

The structural grep `grep -r 'UPDATE.*commission_entries\|.update.*commission_entries' apps/web/` continues to return 0 matches after Story 4.2.

---

## Story 4.3 amendment — Read-side conventions (Monthly Commission Report)

**Date:** 2026-05-03
**Story:** 4.3 Monthly Commission Report
**Authors:** @sm (River) + @po (Pax) decisions; implementation @dev (Dex YOLO)

### Read-only snapshot data — never recompute

Story 4.3 is the FIRST READER of `commission_entries` data. The reader's display columns (`commission_entries.{percent_applied, commission_amount_brl, service_price_brl}`) come from the snapshot Story 4.2's writer persisted at COMPLETED time — **never** from current `professionals.commission_default_percent` or any live engine call. This preserves the AC5 immutability invariant Story 4.2 worked to defend: a rule edit must not retroactively shift past-period payroll.

Drill-down rows resolve `clientName` + `serviceName` from current `clients.name` + `services.name` (NOT denormalized into `commission_entries`). If a service is renamed post-COMPLETED, the report shows the new name. Rare in practice; non-issue at MVP scale; defer to Phase 2 if a partner reports payroll surprise.

### Period scoping default = `commission_entries.created_at`

The aggregation Server Action filters by `commission_entries.created_at >= from AND created_at < to` (caller-supplied UTC instants from SP-midnight boundaries — see "Brazilian timezone correctness" below). Two candidate columns existed:

| Column | Semantics | Trade-off |
|---|---|---|
| `commission_entries.created_at` (chosen) | When commission was calculated (= when appointment marked COMPLETED) | Matches "fechamento mensal" mental model. Late-marked appointments appear in the month they were marked COMPLETED. |
| `appointments.scheduled_at` (deferred) | When the service was actually performed | Strictly accurate to "service month" but appointment edits could shift past report retroactively. |

`created_at` aligns with how a salon owner closes payroll: "vou fechar Maio" = "all commissions calculated in May". A Phase 2 toggle to `scheduled_at` is straightforward if a partner reports drift between expectations and report contents.

### Brazilian timezone correctness — period boundaries

Default month boundaries are computed as wall-clock midnight in `America/Sao_Paulo` (UTC-3) and converted to absolute UTC for the query. Naive UTC boundaries would misattribute appointments at 23h SP on the last day of a month into the following month (boundary off by 3 hours).

Implemented in `apps/web/app/(dashboard)/comissao/period.ts` via `date-fns-tz` (`fromZonedTime`, `toZonedTime`). Pattern mirrors `apps/web/lib/agenda/date-range.ts:53-79` (`computeWindow`).

Sentinel test: an appointment at `2026-04-30T23:30:00-03:00` (= `2026-05-01T02:30:00Z` UTC) does NOT appear in the May report.

### NO PostgREST embed — convention upheld

Both Server Actions (`fetchCommissionReportSummary` and `fetchCommissionReportRows`) follow the codebase convention established by Story 4.2 PR #33 hotfix: separate `IN` queries to resolve relations, never `from('X').select('..., Y!inner(...)')` syntax. PostgREST embed shapes silently differ from mock-test expectations and were the root cause of the Story 4.2 production bug.

Aggregation strategy chosen: **JS reduce on raw rows** instead of PostgREST aggregation (`.select('col,col.sum()')`). Rationale documented in `.ai/decision-log-4.3.md` D-003. At MVP scale (~500 commission_entries/month), the wire-transfer + reduce cost is ~50ms — well under the AC5 1s budget. Phase 2 can swap to an RPC migration `fetch_commission_summary` if scale demands it.

### Test coverage added in 4.3

- **`apps/web/app/(dashboard)/comissao/csv.test.ts`** — 11 vitest cases covering the Brazilian payroll CSV format (BOM + `;` separator + CRLF + comma decimal + dd/MM/yyyy date + TOTAL row + RFC 4180 escaping for fields containing `;` or `"`).
- **`apps/web/app/(dashboard)/comissao/period.test.ts`** — timezone correctness regression suite (TIMEZONE-FINDING-4.3-001): the SP-midnight ↔ UTC conversion never misattributes boundary-day appointments.
- **`apps/web/app/(dashboard)/comissao/actions.test.ts`** — Server Action mocks asserting NO PostgREST embed (separate `from()` calls captured), rounding correctness on aggregates, sort by commissionBrl DESC, friendly error path on DB failure.
- **`apps/web/integration/commission-report-perf.integration.test.ts`** — real-DB integration test validating AC5 perf budget. 50 commission_entries inserted via service-role bulk insert; aggregation completes in ~450ms wall-clock (sentinel `< 500ms`). Reuses the framework from 4.2-TEST-001.
- **`apps/web/e2e/commission-report.spec.ts`** — Playwright happy-path: render `/comissao` + filter form + quick-presets + export buttons + table-or-empty + axe-core 0 critical violations.

### Format helper consolidation (closes 4.1-MNT-001 + 4.2-MNT-001)

`apps/web/lib/format.ts` exports `formatBrl(value: number): string` (Intl `pt-BR` currency). 3rd-usage threshold met (commission-simulator + appointment-detail-dialog + commission-report). Both prior call sites migrated to the shared helper. Side effect: `appointment-detail-dialog.tsx` gains thousands separator (`R$ 1.234,56` instead of `R$ 1234,56`) for amounts ≥ R$ 1.000,00.

Out of scope (other stories' surfaces — left for their own refactor cadence): 7 additional `.toFixed(2).replace('.', ',')` sites in `servicos/types.ts`, `appointment-form.tsx`, `onboarding/.../step-3-prices-form.tsx`, public booking pages.
