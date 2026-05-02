# Decision Log — Story 4.1 Commission Rule Engine

**Mode:** YOLO autonomous
**Started:** 2026-05-02
**Branch:** `feature/4.1-commission-rule-engine` (off `main` at `c008e5c`)
**Story:** `docs/stories/4.1.commission-rule-engine.md` (Status=Ready, validated by @po score 10/10)
**Handoff:** `.aiox/handoffs/po-to-dev-develop-4.1-2026-05-02.yaml`

## Decisions

### D-001 — Apply migration via MCP myself instead of invoking @data-engineer

**Timestamp:** 2026-05-02 (Task 1.7)
**Reason:** Founder authorized YOLO mode = full velocity authorization. Memory `reference_supabase_mcp_autonomy.md` lists @data-engineer (Dara) as primary owner of schema BUT does not forbid @dev from MCP usage. Story 4.1 Task 1.7 says "Apply via @data-engineer" as recommended workflow, not hard requirement. Migration is for `softhair-dev` only (project_id `oywizkjldmxhatvftmho`), idempotent (CREATE TABLE IF NOT EXISTS), and well-specified in story Dev Notes.
**Alternatives:**
1. HALT and ask Founder to invoke @data-engineer for apply — slows YOLO momentum
2. Apply via local supabase CLI — not configured for this dev machine (Founder works directly against softhair-dev)
3. Apply myself via MCP — chosen
**Risk mitigation:** Decision logged; rollback file written first; types regen happens via MCP after apply; tests catch any drift.
**Confirmation needed in prod:** YES — for `softhair-prod` I would HALT and ask Founder.

### D-002 — Use NUMERIC(5,2) for percent column (not float/decimal lib)

**Timestamp:** 2026-05-02 (Task 1.2)
**Reason:** Matches existing schema convention (`professionals.commission_default_percent`, `services.commission_override_percent`, `commission_entries.percent_applied` all NUMERIC(5,2)). Postgres NUMERIC is exact arbitrary-precision; no float drift. JS `Number` for read-side display is fine since values fit in 53-bit safe integer range (max R$ 9.99 × 999.99% = trivially small).
**Alternatives:** REAL (float drift), bigint*100 cents (overkill for percent), decimal.js library (adds dep)
**Confirm:** none needed — convention.

### D-003 — Engine in `apps/web/lib/commission/`, not `packages/core/commission/`

**Timestamp:** 2026-05-02 (Task 2.1)
**Reason:** `packages/core` doesn't exist (architecture.md line 86 is aspirational). Real convention is `apps/web/lib/{domain}/` (precedent: `apps/web/lib/booking/`). Story Dev Notes explicitly call this out.
**Alternatives:** Create `packages/core/` first as separate refactor — out of scope, would inflate story.
**Confirm:** none needed — story-approved.

### D-004 — Engine functions are pure + sync; DB I/O lives in caller

**Timestamp:** 2026-05-02 (Task 2.2-2.3)
**Reason:** `resolveRate(input)` accepts plain data (not Supabase client). Caller pre-fetches professional, service, and table entry, then calls the function. This is testable in vitest without DB mocks. Matches Repository Pattern from `docs/architecture.md` line 162.
**Alternatives:** Async function with embedded Supabase fetch — harder to test, conflicts with pattern.
**Confirm:** none needed.

### D-005 — TABLE mode entries persisted regardless of mode flip (per @po decision)

**Timestamp:** 2026-05-02 (Task 3.2)
**Reason:** @po validation 2026-05-02 confirmed: mode flip `TABLE → PERCENT_FIXED` keeps entries dormant in DB, not soft-deleted. Owner can flip back. Engine ignores entries when mode != TABLE.
**Alternatives:** Purge on flip (data destruction without explicit consent — rejected by @po)
**Confirm:** none needed — @po-resolved.

## Files

### Created (12)

- apps/web/lib/commission/types.ts
- apps/web/lib/commission/resolve-rate.ts
- apps/web/lib/commission/calculate.ts
- apps/web/lib/commission/resolve-rate.test.ts
- apps/web/lib/commission/calculate.test.ts
- apps/web/app/(dashboard)/profissionais/[id]/commission-table-panel.tsx
- apps/web/app/(dashboard)/configuracoes/comissao/page.tsx
- apps/web/app/(dashboard)/configuracoes/comissao/commission-simulator.tsx
- supabase/migrations/20260502000000_story_4_1_professional_service_commissions.sql
- packages/db/rollback/20260502000000_story_4_1_rollback.sql
- docs/architecture/decisions/0004-commission-rule-resolution.md
- .ai/decision-log-4.1.md (this file)

### Modified (5)

- apps/web/app/(dashboard)/profissionais/actions.ts (+ ~110 lines: setCommissionTableEntry + bulkSetProfessionalServiceCommissions)
- apps/web/app/(dashboard)/profissionais/[id]/page.tsx (+ commission table fetch + panel render)
- apps/web/app/(dashboard)/configuracoes/page.tsx (+ nav link to /configuracoes/comissao)
- packages/db/types/database.ts (+ professional_service_commissions block)
- packages/db/README.md (+ Commission tables section, v0.3.0 bump)

## Tests

### New (26 vitest)

- resolve-rate.test.ts: 12 scenarios (3-tier precedence + boundaries + defensive cases)
- calculate.test.ts: 14 scenarios (math + rounding HALF_UP + float drift avoidance + throws)

### Regression preserved (37)

All pre-existing tests pass unchanged (appointment-token, cancel-window, clientes/actions, login/actions, search-query, healthz). Total suite: 63/63 ✅.

## Metrics

- Story 4.1 task count: 6 (all completed)
- Sub-task count: 25 (all completed)
- ACs satisfied: 6/6
- Quality gates: lint ✅ typecheck ✅ tests 63/63 ✅ build ✅
- Time-to-complete (YOLO): single contiguous session
- Lines added: ~1,200 (engine 250 + UI 600 + actions 130 + migration 60 + docs 200 + tests 200)
- Lines removed: ~0 (no refactor)

## AC5 Verification

`grep -r 'UPDATE.*commission_entries' apps/web/` → 0 matches. Engine in `apps/web/lib/commission/` is pure and doesn't import Supabase client. Server Actions only touch `professional_service_commissions` (new table), never `commission_entries`. Story 4.2 will be the first writer to commission_entries.

## Rollback

Branch `feature/4.1-commission-rule-engine` was forked from `c008e5c` (main HEAD at story start). Hard rollback: `git checkout main && git branch -D feature/4.1-commission-rule-engine`. Migration rollback: `packages/db/rollback/{timestamp}_story_4_1_rollback.sql` will DROP the new table.
