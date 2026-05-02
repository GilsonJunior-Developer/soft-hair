# PO Validation Report — Story HARD.1

**Story:** `docs/stories/HARD.1.story.md`
**Validator:** Pax (@po)
**Date:** 2026-05-02
**Verdict:** **GO** — Implementation Readiness Score: **10/10** | Confidence: **High**

---

## Quick Summary

Story is **READY for Implementation**. The handoff from River (@sm) preserved the scoping rigor of the upstream PO handoff (`po-to-sm-hardening-sprint-2026-04-29.yaml`) without introducing new ambiguities. All 7 ACs are testable, all 11 tasks map cleanly to ACs, and the 6 documented risks have proportionate mitigations. Two flags raised by @sm during draft were resolved at validation time (see Decisions section below).

Status transitioned: **Draft → Ready** (per `.claude/rules/story-lifecycle.md`).

---

## Validation Matrix

| # | Step | Status | Notes |
|---|---|---|---|
| 1 | Template Completeness | PASS | All sections present; placeholders for @dev/@qa fields are intentional (per template) |
| 1.1 | Executor Assignment | PASS (with 1 note) | `executor: @dev`, `quality_gate: @qa`, tools array populated. Note: validation task lists @architect/@dev/@pm as known QGs — @qa is canonical per `story-lifecycle.md` Phase 4. Treat the task list as incomplete docs, not story defect |
| 2 | File Structure & Source Tree | PASS | Tree explicit in Dev Notes#File Locations; paths match turborepo monorepo |
| 3 | UI/Frontend Completeness | N/A | Hardening story — no new UI. a11y assertions per spec satisfy frontend touchpoint |
| 4 | AC Satisfaction | PASS | 7 ACs, 1:1 mapping to Tasks: AC1→T1+T2; AC2→T2.3+T3-7 axe; AC3→T3-7; AC4→T8; AC5→T9; AC6→T11; AC7→T10 |
| 5 | Validation/Testing Instructions | PASS | Per-spec scenarios listed; framework versions cited; test data flagged in RISK-TEST-USER |
| 6 | Security | PASS | Workflow security in CodeRabbit Focus (action pinning, secrets, token scopes); seed pattern flagged for no-credential-leak |
| 7 | Tasks Sequence | PASS (with 1 note) | Logical Task 1→11 ordering. Note: T2.2 has soft-dep on Founder (test user creation) — captured in RISK-TEST-USER, allows T1/T8/T9/T10 parallel |
| 8 | CodeRabbit Integration | PASS | Section complete: type=Deployment+Frontend, complexity=High, light self-heal, focus areas type-matched |
| 9 | Anti-Hallucination | PASS | All technical claims traceable. Self-aware caveats on action versions (T9.1 defers to execution-time). 21 unit tests claim verifiable in repo |
| 10 | Dev Implementation Readiness | PASS | Self-contained, clear instructions, complete tech context |

**10-Point Lifecycle Checklist (story-lifecycle.md):** 10/10 ✅

| # | Item | ✓ |
|---|---|---|
| 1 | Clear and objective title | ✅ |
| 2 | Complete description (problem/need explained) | ✅ |
| 3 | Testable acceptance criteria | ✅ |
| 4 | Well-defined scope (IN + OUT clearly listed) | ✅ |
| 5 | Dependencies mapped | ✅ |
| 6 | Complexity estimate | ✅ (High) |
| 7 | Business value | ✅ (anti-regression + 2026-06-02 deadline) |
| 8 | Risks documented | ✅ (6 risks) |
| 9 | Criteria of Done | ✅ (AC6 + Task 11) |
| 10 | Alignment with PRD/Epic | ✅ (cross-epic admonition explicit) |

---

## Critical Issues (Must Fix)

**None.** No blockers.

---

## Should-Fix Issues (Important Quality Improvements)

**None.** Quality is high.

---

## Nice-to-Have Improvements

1. **Task 1.1 version pinning.** Story specifies `@playwright/test@^1.4x` and `@axe-core/playwright@^4.x` — `1.4x` is a version family, not a valid semver caret range. @dev should resolve to actual semver at install time (e.g., `^1.49.0`). Not blocking — common @dev judgment.
2. **Task 2.2 split suggestion.** Could split into 2.2a (write seed code, no Founder dep) + 2.2b (run seed end-to-end, blocked by test user). Marginal benefit; current `RISK-TEST-USER` mitigation covers it.
3. **Lighthouse CI cross-reference.** Story notes Lighthouse already configured (PR #19) but does NOT add it as an AC. PR-merge of HARD.1 will trigger Lighthouse — worth a sentence in `docs/testing/e2e.md` (Task 10) explaining the relationship between Lighthouse + axe-core scope split.

---

## Anti-Hallucination Findings

**None.** All claims verified:
- Vitest 2.x ✓ (`docs/architecture.md:199`)
- Playwright 1.4x ✓ (`docs/architecture.md:200`)
- Next.js 15.0.7 ✓ (`apps/web/package.json:26`)
- 21 unit tests ✓ (`docs/stories/2.7.client-appointment-management.md:127`)
- Action versions current state ✓ (`.github/workflows/ci.yml:25,60,63,82,85,104,107`)
- CI conditional on `apps/web/playwright.config.ts` ✓ (`.github/workflows/ci.yml:46`)
- Self-aware caveat on future versions (T9.1) — proper anti-hallucination behavior

---

## CodeRabbit Integration Findings

**Status:** PASS (with 1 framework-config note documented separately)

- ✅ Section present, all subsections populated
- ✅ Story Type Analysis: Deployment/Infrastructure primary, Frontend secondary, complexity=High — all match scope
- ✅ Specialized Agent Assignment: @dev primary (executor), @devops co-owns AC5 (workflows). @qa + @ux-design-expert as supporting
- ✅ Quality Gates: Pre-Commit (@dev), Pre-PR (@devops), Pre-Deployment (@devops) all defined
- ✅ Self-Healing: light mode, 2 iterations, 15 min, CRITICAL+HIGH severity matrix matches `.claude/rules/coderabbit-integration.md` Dev Phase config
- ✅ Focus Areas: workflow security, Playwright config, E2E spec quality, axe-core tags, lockfile diff — all proportionate

**Framework note (separate finding, NOT a story defect):** `coderabbit_integration` block is absent from `core-config.yaml`. Dev agent yaml expects `enabled: true`. Stories (2.7, HARD.1) populate the section correctly. Tracked as `MNT-CONFIG-002` in backlog.

---

## Decisions on Flagged Items (from `sm-to-po-validate-HARD.1-2026-05-01` handoff)

### FLAG-NUMBERING — `HARD.1` vs `2.8`

**Decision: APPROVED `HARD.1`** (River's first choice).

**Rationale:**
1. Epic 2 closed officially at 100% (7/7) on 2026-04-29 per change log + Founder decision + handoff. Renaming to `2.8` retroactively reopens it, creating numerical/semantic friction with the closure.
2. The story explicitly markets itself as "cross-epic hardening track" in the admonition above the `## Story` heading. Naming should mirror that positioning.
3. Sets clean precedent: future hardening sprints (post-Epic 3, post-MVP) get `HARD.2`, `HARD.3`. Parallel track.
4. River's reasoning is sound; PO override would be churn without value.

**Trade-off accepted:** Tooling that globs `{epicNum}.{storyNum}.story.md` will need to also pick up `HARD.*.story.md`. Existing tools (story index, glob) are loose; impact verified minimal.

### FLAG-CONFIG-DRIFT — `core-config.yaml#architectureSharded: true`

**Decision: ACKNOWLEDGED — out of scope for HARD.1.** Tracked as `MNT-CONFIG-001` (low/P2) in backlog.

**Rationale:**
- Drift exists (config says sharded, reality monolithic) but does NOT block any active story. River + Pax both used fallback monolithic citations successfully.
- Scope creep risk if added to HARD.1 — separates concern: HARD.1 is testing/CI hardening, not framework hygiene.
- Backlog item `MNT-CONFIG-001` assigns @architect for resolution decision: (a) split architecture into shards, OR (b) flip flag to false. Either acceptable; not a forcing function for HARD.1.

While reviewing config, also discovered: `coderabbit_integration` block ABSENT from `core-config.yaml`. Tracked as `MNT-CONFIG-002` (low/P2) for @aiox-master.

---

## Developer Perspective

**Could @dev (Dex) implement this story as written?** Yes. The story is dense but linear:
- Task 1 unblocks everything else.
- Tasks 3-7 (specs) can run in parallel (independent files).
- Tasks 8-9 (CI updates) are independent of test code.
- Task 11 is the integration point — runs after 1-10.

**Likely questions @dev might raise:**
1. **`pnpm test:e2e` script location** — root vs `apps/web` only? Story addresses this in Dev Notes#CI Workflow current state with two valid patterns. @dev picks one.
2. **Test user setup** — flagged blocker for Task 2.2; resolution path documented (Founder coordinates).
3. **Action version drift between draft and execution** — Task 9.1 explicitly defers research to execution time. Good.

**Likely delays/rework triggers:**
- `RISK-FLAKY` realizing in CI (high probability — first E2E suite ever). Mitigation: `continue-on-error: true` for first week is a sound concession.
- `RISK-NODE-24-BREAK` if Tailwind 4 beta or React 19 RC hits a Node-24 incompatibility. Low probability, mitigation = revert workflow YAML commit.

**Recommended @dev mode:** **Interactive** (default) for this story given complexity=High and it's the first E2E suite. YOLO mode acceptable IF @dev has high-confidence Playwright background.

---

## Final Assessment

- [x] **GO** — Story is ready for implementation
- [ ] NO-GO — Story requires fixes
- [ ] BLOCKED — External information required

**Implementation Readiness Score:** 10/10
**Confidence Level:** High
**Status Transition:** Draft → **Ready** ✅

**Next:** `@dev *develop HARD.1`

---

## Post-Validation Actions Performed by PO

1. ✅ Story `## Status` updated `Draft` → `Ready` (per `.claude/rules/story-lifecycle.md`)
2. ✅ Story Change Log: appended v1.1 entry (validation result + decisions on flags)
3. ✅ Backlog: added `MNT-CONFIG-001` (architectureSharded desync) + `MNT-CONFIG-002` (coderabbit_integration absent), both low/P2, owners @architect/@aiox-master
4. ✅ Backlog Histórico: appended 2026-05-01 + 2026-05-02 entries
5. ✅ Handoff artifact `po-to-dev-develop-HARD.1-2026-05-02.yaml` written (next agent suggestion)

— Pax, equilibrando prioridades 🎯
