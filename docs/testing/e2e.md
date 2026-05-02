# E2E Testing — Playwright + axe-core

> **Status:** Framework landed via Story `HARD.1` (2026-05-02). Real specs (`1.5/1.6/1.7/2.4/2.5`) follow once `PREREQ-TEST-USER` and `PREREQ-SUPABASE-SERVICE-ROLE` are resolved.

This is the SoftHair end-to-end testing reference. It covers Playwright setup, the axe-core a11y gate, and the conventions every spec must follow.

---

## TL;DR

```bash
# One-time per machine
pnpm install
pnpm --filter @softhair/web exec playwright install chromium webkit

# Day-to-day (locally — uses next dev)
pnpm --filter @softhair/web test:e2e            # headless, both browsers
pnpm --filter @softhair/web test:e2e:ui         # Playwright UI mode (best for development)
pnpm --filter @softhair/web test:e2e:debug      # PWDEBUG=1 — step-through inspector

# Through turbo (mirrors CI)
pnpm test:e2e
```

CI runs the suite in **production mode** (`next build && next start`) for determinism. Local defaults to **dev mode** (`next dev`) so you get hot reload while iterating.

---

## Stack

| Layer | Tool | Version |
|---|---|---|
| Test runner | `@playwright/test` | 1.59.x |
| A11y scanner | `@axe-core/playwright` | 4.11.x |
| App server (CI) | `next start` after `next build` | from `apps/web` |
| App server (local) | `next dev` | from `apps/web` |
| CI runner | `ubuntu-latest` + Node 24 | via `.github/workflows/ci.yml` |
| Browsers | Chromium + Webkit | downloaded once via `playwright install` |

Why no Firefox or Edge? Out of scope for the MVP (handoff `po-to-sm-hardening-sprint-2026-04-29`). Add in Phase 2 if a design partner reports bugs only on those browsers.

---

## Repository layout

```
apps/web/
├── playwright.config.ts            # projects (chromium + webkit), webServer, retries, traces
├── e2e/
│   ├── fixtures/
│   │   ├── axe.ts                  # assertNoA11yViolations(page, options) — WCAG 2.1 AA tags
│   │   ├── index.ts                # extended `test` re-export — specs MUST import from here
│   │   ├── auth.ts                 # PLACEHOLDER — added once PREREQ-TEST-USER resolves
│   │   └── seed.ts                 # PLACEHOLDER — added once PREREQ-SUPABASE-SERVICE-ROLE resolves
│   ├── smoke.spec.ts               # canary spec proving the pipeline works end-to-end
│   └── *.spec.ts                   # one file per Story under test (pattern: <story-area>.spec.ts)
```

Specs **must** import from `./fixtures` (or a relative path equivalent) — never from `@playwright/test` directly. That's how axe (and later auth + seed) get wired in transparently.

```typescript
// apps/web/e2e/some.spec.ts
import { test, expect } from './fixtures';

test('does the thing accessibly', async ({ page, axe }) => {
  await page.goto('/some-route', { waitUntil: 'domcontentloaded' });
  await axe.assertNoA11yViolations({ include: 'main' });
});
```

---

## Conventions (non-negotiable)

### 1. `data-testid` over text/CSS selectors

E2E flake almost always traces back to selectors that target text or visual structure. Both move under design churn. Use `data-testid` exclusively for elements specs assert on.

```tsx
// app code
<button data-testid="appointment-cancel-confirm">Confirmar cancelamento</button>

// spec
await page.getByTestId('appointment-cancel-confirm').click();
```

When you discover a missing testid while writing a spec, **add it to the source code in the same PR** — don't reach for a fragile workaround. The story File List should reflect both files.

### 2. Zero `page.waitForTimeout(N)`

Wall-clock waits are flake amplifiers. Always wait on a state condition:

```typescript
// ❌ flake bait
await page.waitForTimeout(800);

// ✅ deterministic
await page.getByTestId('save-indicator').waitFor({ state: 'visible' });
await page.waitForResponse((r) => r.url().includes('/api/clients') && r.status() === 200);
await page.waitForFunction(() => document.querySelectorAll('[data-testid=client-card]').length === 3);
```

CodeRabbit flags `waitForTimeout` as a story-level violation per `HARD.1` Focus Areas.

### 3. `domcontentloaded`, not `load`, in dev mode

Next 15 dev-server keeps an HMR websocket open, which means the `load` event never fires. `page.goto('/route')` will time out under default options.

```typescript
// ✅ works in dev mode AND production mode
await page.goto('/clientes', { waitUntil: 'domcontentloaded' });
```

In CI we run production builds (`next start`) so this is purely a local-DX gotcha — but write specs that work in both modes from day 1.

### 4. axe-core on every spec — at least once

Every spec **must** include at least one `axe.assertNoA11yViolations()` call against the route(s) it covers. This is how `HARD.1 AC2` ("0 critical violations") is enforced per-route, complementing Lighthouse CI's global Accessibility ≥ 95 score.

```typescript
// minimum for a route
await axe.assertNoA11yViolations({ include: 'main' });

// scope away third-party widgets we don't own
await axe.assertNoA11yViolations({
  include: 'main',
  exclude: ['[data-third-party]'],
});
```

The default fail threshold is **critical**. To raise the bar on a high-stakes flow, pass `failOnImpact: 'serious'`.

### 5. Test isolation

Each spec creates its own data via the `seed` fixture (when it lands) and cleans up in `test.afterEach`. Never depend on data created by another spec — Playwright's `--shard` and parallel workers will betray you.

---

## Debugging flaky specs

When a spec fails in CI but passes locally (or vice versa), in this order:

1. **Pull the artifact.** Every CI failure uploads `playwright-report-${browser}` (always) and `test-results-${browser}` (on failure) for 7 / 3 days respectively. Download from the GitHub Actions run page.
2. **Open the trace.** `npx playwright show-trace test-results/path/trace.zip` opens an interactive timeline with screenshots, network, console — usually faster than reading logs.
3. **Watch the video.** `test-results/path/video.webm` for visual confirmation of what the browser actually saw.
4. **Re-run with `--repeat-each=10`** locally to catch race conditions:
   ```bash
   pnpm --filter @softhair/web exec playwright test some.spec.ts --repeat-each=10
   ```
5. **Headed + slow-mo** for the human-eyeball pass:
   ```bash
   pnpm --filter @softhair/web exec playwright test some.spec.ts --headed --workers=1
   ```
6. **Isolate the timing.** If a spec passes in `--workers=1` but fails parallel, the issue is shared state (DB rows, auth cookie, dev-server reuse). Audit `seed` cleanup hooks.

If after all that the flake persists and is **not user-impacting**, mark the test `test.fixme()` with a link to a follow-up issue. Do **not** crank `retries` to mask it — `retries: 2` is the cap.

---

## CI integration

Workflow: `.github/workflows/ci.yml` job `e2e:`. Conditional on `apps/web/playwright.config.ts` existing (gate set in `detect:` job). Runs on PRs to `main` and pushes to `main`.

### Matrix

| Browser | OS | Notes |
|---|---|---|
| `chromium` | ubuntu-latest | Fast (~1.2x of Webkit) |
| `webkit` | ubuntu-latest | Slower; some Apple-specific rendering bugs only surface here |

Both run in parallel via `strategy.matrix.browser`.

### Temporary `continue-on-error: true`

The first ~1 week post-`HARD.1` merge, the `e2e:` job uses `continue-on-error: true`. Rationale: every new test infrastructure has a flaky shake-out period; blocking legitimate PRs while we tune timeouts/selectors costs more than it earns.

**This must be removed** after the suite is stable. Tracked under `2.5-TEST-001` close-out / a follow-up backlog item. The `# TODO(HARD.1 follow-up)` comment in `ci.yml` makes the removal task discoverable via grep.

### Artifacts

| Artifact | Trigger | Retention |
|---|---|---|
| `playwright-report-${browser}` | always | 7 days |
| `test-results-${browser}` (traces, videos, screenshots) | on failure | 3 days |

Reports are HTML — download the zip, `unzip`, and open `index.html`.

---

## Seed data + test user (placeholder)

> **Currently blocked on PREREQ-TEST-USER and PREREQ-SUPABASE-SERVICE-ROLE.** This section becomes load-bearing once Tasks 2.1 + 2.2 of `HARD.1` land.

The plan:

- Dedicated test user `e2e+test@softhair.com` in `softhair-dev` with one minimal salon: 3 services, 2 professionals, 3 clients pre-seeded.
- `seed` fixture uses `SUPABASE_SERVICE_ROLE_KEY` (server-side only) to insert per-spec rows that bypass RLS, then cleans them in `afterEach`/`afterAll`.
- Auth fixture logs the test user in via Supabase OTP (mocked OTP code in dev) and stores the session cookie on the Playwright browser context.

Until then, specs that need login or seeded data should call `test.fixme()` with a link to the unblocking work, not skip silently.

---

## Local environment

You need:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY              # for seed fixture (Task 2.2)
APPOINTMENT_TOKEN_SECRET               # for Story 2.7 routes that may be hit
```

Copy from `.env.example` to `.env.local` and fill from `softhair-dev` keys.

`pnpm --filter @softhair/web exec playwright install chromium webkit` once per machine — it downloads the browsers (~250 MB).

To run against an already-running dev server (e.g. `pnpm dev` in another terminal):

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3000 pnpm --filter @softhair/web test:e2e
```

The `webServer` block in `playwright.config.ts` is skipped when `PLAYWRIGHT_BASE_URL` is set — Playwright assumes you're managing the server yourself.

---

## Relationship to other gates

| Gate | What it catches | Where |
|---|---|---|
| `pnpm test` (Vitest) | Unit + integration logic, schema invariants | apps/web/lib/*.test.ts |
| `pnpm test:e2e` (Playwright + axe) | User-visible flows, per-route a11y critical violations | apps/web/e2e/ |
| Lighthouse CI | Global Performance ≥ 85 mobile + Accessibility ≥ 95 | apps/web/lighthouserc.json |
| CodeRabbit | Code patterns, security smells, test coverage signals | per PR |

Playwright is the **only** gate that exercises the full stack against a real browser. Vitest is faster but fakes the DOM; Lighthouse is a static-budget check, not a behavior check; CodeRabbit reads code, not runtime.

---

## Adding a new spec — checklist

1. Pick a clear file name: `{story-area}.spec.ts` (e.g. `professional-crud.spec.ts`).
2. Import `test` from `./fixtures` (not `@playwright/test`).
3. Add at least one `axe.assertNoA11yViolations()` call.
4. Use `data-testid` selectors. If a needed testid is missing in the app code, add it in the same change.
5. Use `domcontentloaded` for `page.goto` calls (works dev + prod).
6. Clean up any seeded data in `test.afterEach`.
7. Run `pnpm --filter @softhair/web test:e2e <file>` locally — pass on both `chromium` and `webkit` before pushing.
8. Update the story `File List` to include the new spec + any source files touched (testids, data-* attrs).

---

## Known gotchas

- **`load` vs `domcontentloaded`** — see Convention #3 above. Always `domcontentloaded`.
- **First-compile latency in dev mode.** Next 15 compiles routes on demand; the first request to a new route can take 20–40s. Local test timeout is 60s for this reason. CI uses `next start` so this is irrelevant there.
- **Webkit is slow.** ~1.5–2× Chromium. Bumping global timeout to 60s accommodates this.
- **Linux is case-sensitive.** Windows/macOS will let `Foo.spec.ts` import from `./fixtures` resolve a different-cased path; Linux CI won't. Stick to lowercase paths.
- **`pnpm --filter ... exec playwright`** sometimes prints `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL` even on success when the test exit code is non-zero (e.g. `--list` with 0 specs). Cosmetic — doesn't affect CI verdict, which uses the playwright exit code via the `pnpm exec` step in the workflow.

---

## Future work

Tracked in `docs/qa/backlog.md`:

- Real specs land via `HARD.1` Tasks 3–7 (5 stories' coverage).
- Remove `continue-on-error: true` after stability window.
- Visual regression (Percy/Chromatic) deferred to Phase 2.
- Mobile device emulation beyond default viewport — also Phase 2.
