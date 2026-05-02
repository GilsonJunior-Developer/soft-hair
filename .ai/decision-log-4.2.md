# Decision Log — Story 4.2 Commission Calculation on Service Completion

**Mode:** YOLO autonomous
**Started:** 2026-05-02
**Branch:** `feature/4.2-commission-calculation-on-completion` (off `main` at `55e8662`)
**Story:** `docs/stories/4.2.commission-calculation-on-completion.md` (Status=Ready, validated by @po score 10/10)
**Handoff:** `.aiox/handoffs/po-to-dev-develop-4.2-2026-05-02.yaml`

## Decisions

### D-001 — Use existing supabase client in Server Action (no service_role escalation)

**Reason:** RLS on commission_entries already SELECT-only at table level (story 4.1's policy is FOR ALL). Inserts during transition Server Action run with the user's session — RLS enforces salon scoping. No need for service_role bypass.
**Confirm:** none — convention.

### D-002 — Single SQL query for engine inputs (joined SELECT)

**Reason:** Task 1.1 spec — single query joins appointments+professionals+services. Reduces round-trips; avoids 3 sequential queries when one suffices. Story 4.1 set the precedent for "fetch once, calc, write".
**Alternatives considered:** 3 separate `.from('x').select(...)` calls — slower, more edge cases.
**Confirm:** none.

### D-003 — Best-effort commission insert with structured logging on failure

**Reason:** Per @po validation caveat (Task 1.6 mandatory). Transition is source of truth; commission is derived data. If insert fails (engine throw, DB conflict not from UNIQUE, etc.), log with structured payload `{appointmentId, reason}` so reconciliation/grep is trivial. DO NOT roll back the status change.
**Format:** `console.error('[transitionAppointmentStatus][commission]', { appointmentId, reason: err.message ?? 'unknown' })`
**Confirm:** none.

### D-004 — Use `.from().upsert({...}, {onConflict:'appointment_id', ignoreDuplicates: true})` for idempotency

**Reason:** Supabase JS doesn't expose raw `INSERT ... ON CONFLICT DO NOTHING` directly. The closest equivalent in supabase-js v2 is `.upsert()` with `ignoreDuplicates: true` flag — produces `INSERT ... ON CONFLICT DO NOTHING` server-side. UNIQUE on appointment_id makes this safe.
**Alternative:** plain `.insert()` and catch the 23505 unique violation error — works but noisier in logs.
**Confirm:** none.

### D-005 — Update appointments.commission_calculated_brl in same Server Action (denormalized read field)

**Reason:** Task 1.5 spec. The column already exists (Story 1.1) and gives O(1) read for agenda display without JOIN to commission_entries. AC5 immutability still holds because we only set it once (when transition to COMPLETED happens; subsequent rule edits don't touch it).
**Confirm:** none.

## Files

### Created (2)

- apps/web/app/(dashboard)/agenda/actions.test.ts (14 vitest scenarios)
- .ai/decision-log-4.2.md (this file)

### Modified (4)

- apps/web/app/(dashboard)/agenda/actions.ts (+ ~115 lines: imports + AgendaAppointment.commissionCalculatedBrl + flat row column + commission flow in transitionAppointmentStatus + calculateAndPersistCommission helper)
- apps/web/components/agenda/appointment-detail-dialog.tsx (+ Comissão row when COMPLETED)
- apps/web/lib/commission/calculate.ts (JSDoc math comment fix — 4.1-DOC-001 carry-over)
- docs/architecture/decisions/0004-commission-rule-resolution.md (+ Story 4.2 Implementation Notes section)

## Tests

### New (14 vitest)

agenda/actions.test.ts:
- 5 precedence permutations (PERCENT_FIXED + override; TABLE + entry; TABLE fallback to override; TABLE fallback to default; PERCENT_FIXED only)
- AC4 discount path (price_brl_final used, not price_brl_original)
- Idempotency (upsert + ignoreDuplicates flag verified)
- Non-COMPLETED transition (PENDING → CONFIRMED) skips commission flow
- Engine fetch failure → structured log + transition still ok
- Insert failure → structured log + transition still ok
- RPC error → no commission flow at all
- Invalid input shape rejected
- AC5 immutability behavioral: engine never calls update; rule edit after COMPLETED no recompute

### Regression preserved (63)

All pre-existing tests pass unchanged (commission engine, appointment-token, cancel-window, clientes/actions, login/actions, search-query, healthz). Total suite: 77/77 ✅.

## Metrics

- Story 4.2 task count: 6 core (all completed) + 1 optional (E2E, skipped per waiver)
- Sub-task count: ~15 (all completed)
- ACs satisfied: 5/5
- Quality gates: lint ✅ typecheck ✅ tests 77/77 ✅ build ✅
- Schema changes: 0 (pure code/tests/docs)
- Carry-overs closed: 4.1-DOC-001 + 4.1-TEST-001 (4.1-MNT-001 deferred per scope)
- Time-to-complete (YOLO): single contiguous session

## AC5 Verification

Production code grep (excluding tests): `grep -rn 'UPDATE.*commission_entries\|.update.*commission_entries' apps/web --include='*.ts' --include='*.tsx' --exclude='*.test.ts'` → 0 matches. The single writer (calculateAndPersistCommission) uses `.upsert(...{ ignoreDuplicates: true })` — never UPDATE.

## Rollback

Branch `feature/4.2-commission-calculation-on-completion` forked from `55e8662`. Hard rollback: `git checkout main && git branch -D feature/4.2-commission-calculation-on-completion`. No DB migration in this story → no schema rollback needed.
