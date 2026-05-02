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

## Seed data + test user

> **Status:** ✅ Test user e fixture mínima existem em `softhair-dev` desde 2026-05-02 (Dara via MCP). Phase 2 fixtures (`auth.ts` / `seed.ts`) podem usar os IDs e credenciais documentados abaixo.

### Credenciais do test user (softhair-dev only)

| Campo | Valor |
|---|---|
| Email | `e2e+test@softhair.com` |
| Senha | `e2e-test-pwd-2026` |
| `auth.users.id` | `a01c0eda-4938-45fc-afbf-15a12fdd02b4` |
| `public.users.name` | `E2E Test Salon Owner` |
| `default_salon_id` | `4e5b99ca-2fc0-46cd-a634-ef8e5b84a1b7` |

⚠️ **NUNCA aplicar este seed em `softhair-prod`.** O SQL abaixo está intencionalmente fora de `supabase/migrations/` e fora de `supabase/seed.sql` para zerar o risco de execução acidental em prod via migration runner.

### Fixture mínima criada

| Recurso | Quantidade | Detalhes |
|---|---|---|
| `salons` | 1 | nome `Salão E2E`, slug `salao-e2e`, city `São Paulo`, cnpj `00000000000000` (test marker), `subscription_status='TRIAL'`, `cancel_window_hours=24` (default) |
| `salon_members` | 1 | role `OWNER` linkado ao test user |
| `professionals` | 2 | `profissional-1` (50% commission, specs: corte+barba), `profissional-2` (60% commission, specs: coloração+escova), working_hours default seg-sab 09-18 |
| `services` | 3 | Corte Masculino (30 min, R$ 50, 50%), Coloração (90 min, R$ 150, 60%), Escova (45 min, R$ 70, 50%) — todos category `cabelo` |
| `clients` | 3 | phones `+5511999000001/2/3`, emails `cliente1/2/3@e2e.softhair.com`, LGPD consent já dado |

### Como recriar manualmente (caso o dev DB seja resetado)

Pré-requisitos:
- Acesso ao project `softhair-dev` (project_id `oywizkjldmxhatvftmho`) via MCP `supabase-project-softhair` ou `psql` com service_role
- Extensions `pgcrypto`, `citext`, `btree_gist` enabled (são por padrão em Supabase)

Cole o bloco abaixo em uma tool com privilégio de service_role (MCP `execute_sql` da Dara, Supabase Studio SQL editor, ou `psql` direto). O bloco é **idempotente** — se o user já existir, retorna `NOTICE` e aborta sem erro.

```sql
DO $$
DECLARE
  v_user_id UUID;
  v_salon_id UUID;
  v_existing_email TEXT;
BEGIN
  -- Idempotency guard
  SELECT email INTO v_existing_email FROM auth.users WHERE email = 'e2e+test@softhair.com';
  IF v_existing_email IS NOT NULL THEN
    RAISE NOTICE 'Test user já existe — aborting (drop manually se quiser recriar)';
    RETURN;
  END IF;

  -- 1. auth.users (trigger handle_new_auth_user vai popular public.users)
  -- IMPORTANT: confirmation_token + recovery_token + email_change* + reauthentication_token
  -- MUST be empty strings (not NULL). GoTrue's Go scanner cannot convert NULL to
  -- string and rejects login with "Database error querying schema" 500 if NULL.
  -- Also: bcrypt cost MUST be 10 (`gen_salt('bf', 10)`) to match GoTrue's hash
  -- expectations; default `gen_salt('bf')` is cost 6 and will produce a hash
  -- GoTrue rejects as "Email ou senha incorretos".
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new,
    email_change, email_change_token_current, reauthentication_token
  )
  VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'e2e+test@softhair.com',
    extensions.crypt('e2e-test-pwd-2026', extensions.gen_salt('bf', 10)),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"name": "E2E Test Salon Owner"}'::jsonb,
    now(), now(),
    '', '', '', '', '', ''
  )
  RETURNING id INTO v_user_id;

  -- Defense (trigger should have populated; ON CONFLICT no-op if already there)
  INSERT INTO public.users (id, email, name)
  VALUES (v_user_id, 'e2e+test@softhair.com', 'E2E Test Salon Owner')
  ON CONFLICT (id) DO NOTHING;

  -- 2. salon
  INSERT INTO public.salons (name, slug, city, cnpj, owner_user_id)
  VALUES ('Salão E2E', 'salao-e2e', 'São Paulo', '00000000000000', v_user_id)
  RETURNING id INTO v_salon_id;

  UPDATE public.users SET default_salon_id = v_salon_id WHERE id = v_user_id;

  -- 3. membership
  INSERT INTO public.salon_members (salon_id, user_id, role)
  VALUES (v_salon_id, v_user_id, 'OWNER');

  -- 4. professionals
  INSERT INTO public.professionals (salon_id, name, slug, specialties, commission_default_percent) VALUES
    (v_salon_id, 'Profissional Teste 1', 'profissional-1', ARRAY['corte', 'barba'], 50.00),
    (v_salon_id, 'Profissional Teste 2', 'profissional-2', ARRAY['coloração', 'escova'], 60.00);

  -- 5. services
  INSERT INTO public.services (salon_id, name, category, duration_minutes, price_brl, commission_override_percent) VALUES
    (v_salon_id, 'Corte Masculino', 'cabelo', 30, 50.00,  50.00),
    (v_salon_id, 'Coloração',       'cabelo', 90, 150.00, 60.00),
    (v_salon_id, 'Escova',          'cabelo', 45, 70.00,  50.00);

  -- 6. clients
  INSERT INTO public.clients (salon_id, name, phone_e164, email, lgpd_consent_at, lgpd_consent_text_hash) VALUES
    (v_salon_id, 'Cliente Teste 1', '+5511999000001', 'cliente1@e2e.softhair.com', now(), 'e2e_test_consent_v1'),
    (v_salon_id, 'Cliente Teste 2', '+5511999000002', 'cliente2@e2e.softhair.com', now(), 'e2e_test_consent_v1'),
    (v_salon_id, 'Cliente Teste 3', '+5511999000003', 'cliente3@e2e.softhair.com', now(), 'e2e_test_consent_v1');

  RAISE NOTICE 'Setup completo. user_id=% salon_id=% (password=e2e-test-pwd-2026)', v_user_id, v_salon_id;
END $$;
```

### Como deletar (se quiser recriar do zero)

```sql
-- ATENÇÃO: rode SOMENTE em softhair-dev. CASCADE elimina tudo: salon + prof + services + clients + appointments + qualquer dado associado.
DO $$
DECLARE
  v_user_id UUID;
  v_salon_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'e2e+test@softhair.com';
  SELECT id INTO v_salon_id FROM public.salons WHERE slug = 'salao-e2e';

  IF v_salon_id IS NOT NULL THEN
    -- Apaga em ordem reversa de FK
    DELETE FROM public.appointments WHERE salon_id = v_salon_id;
    DELETE FROM public.clients WHERE salon_id = v_salon_id;
    DELETE FROM public.services WHERE salon_id = v_salon_id;
    DELETE FROM public.professionals WHERE salon_id = v_salon_id;
    DELETE FROM public.salon_members WHERE salon_id = v_salon_id;
    UPDATE public.users SET default_salon_id = NULL WHERE default_salon_id = v_salon_id;
    DELETE FROM public.salons WHERE id = v_salon_id;
  END IF;

  IF v_user_id IS NOT NULL THEN
    DELETE FROM public.users WHERE id = v_user_id;
    DELETE FROM auth.users WHERE id = v_user_id;
  END IF;
END $$;
```

### Pattern para `seed` fixture (Phase 2 Task 2.2)

A fixture `seed` deve usar `SUPABASE_SERVICE_ROLE_KEY` (já está em GH Actions secrets) para fazer INSERTs per-spec adicionais (appointments, clients extra, etc) e cleanup em `afterEach`. Sugestão de pattern:

```typescript
// apps/web/e2e/fixtures/seed.ts (skeleton)
import { createClient } from '@supabase/supabase-js';

const TEST_SALON_ID = '4e5b99ca-2fc0-46cd-a634-ef8e5b84a1b7';
const TEST_USER_ID  = 'a01c0eda-4938-45fc-afbf-15a12fdd02b4';

export function createServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export async function seedAppointment(opts: { ... }) {
  const sb = createServiceRoleClient();
  const { data, error } = await sb.from('appointments').insert({
    salon_id: TEST_SALON_ID,
    professional_id: opts.professionalId,
    /* ... */
  }).select().single();
  if (error) throw error;
  return data;
}

export async function cleanupTestAppointments() {
  const sb = createServiceRoleClient();
  await sb.from('appointments').delete().eq('salon_id', TEST_SALON_ID);
}
```

### Pattern para `auth` fixture (Phase 2 Task 2.1)

```typescript
// apps/web/e2e/fixtures/auth.ts (skeleton)
import type { Page } from '@playwright/test';

export async function loginAsTestSalonOwner(page: Page) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('login-email').fill('e2e+test@softhair.com');
  await page.getByTestId('login-password').fill('e2e-test-pwd-2026');
  await page.getByTestId('login-submit').click();
  await page.waitForURL(/\/(dashboard|hoje|profissionais)/, { timeout: 10_000 });
}
```

Os `data-testid` em `login-email`, `login-password`, `login-submit` precisam ser adicionados no formulário de login do app — listar em Task 2.1 do `HARD.1`.

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
- **First-compile latency in dev mode.** Next 15 compiles routes on demand; the first request to a new route can take 20–60s on Webkit. Local `navigationTimeout` is 60s for this reason. CI uses `next build && next start` so this is irrelevant there. Auth-gated specs are flaky in local dev mode; trust CI (production build) as the source of truth.
- **Webkit is slow.** ~1.5–2× Chromium. Global timeout 60s accommodates this.
- **Linux is case-sensitive.** Windows/macOS will let `Foo.spec.ts` import from `./fixtures` resolve a different-cased path; Linux CI won't. Stick to lowercase paths.
- **`pnpm --filter ... exec playwright`** sometimes prints `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL` even on success when the test exit code is non-zero (e.g. `--list` with 0 specs). Cosmetic — doesn't affect CI verdict, which uses the playwright exit code via the `pnpm exec` step in the workflow.
- **Direct `INSERT INTO auth.users` requires empty-string token fields.** GoTrue's Go scanner panics if `confirmation_token`, `recovery_token`, `email_change_token_new`, `email_change`, `email_change_token_current`, or `reauthentication_token` are NULL — login returns 500 "Database error querying schema". Always set them to `''`. Surfaced during Phase 2 of HARD.1 (2026-05-02). Reflected in the SQL block above.
- **Direct password hash via `crypt()` requires bcrypt cost 10.** GoTrue verifies passwords against `$2a$10$...` hashes; default `gen_salt('bf')` produces cost-6 hashes that GoTrue rejects as "Email ou senha incorretos". Use `gen_salt('bf', 10)` explicitly.
- **`MNT-A11Y-001` (tracked):** `/servicos` has a `<select>` without an accessible name (axe-core rule `select-name`). Spec excludes it temporarily; remove exclude after fix.

---

## Future work

Tracked in `docs/qa/backlog.md`:

- Real specs land via `HARD.1` Tasks 3–7 (5 stories' coverage).
- Remove `continue-on-error: true` after stability window.
- Visual regression (Percy/Chromatic) deferred to Phase 2.
- Mobile device emulation beyond default viewport — also Phase 2.
