import { test, expect } from './fixtures';

/**
 * Story HARD.1 Task 7 — covers Story 2.5 (Client History & Profile).
 * Resolves: 2.5-TEST-001 (P0).
 *
 * Scope (Phase 2 minimum-viable):
 * - Authenticated render of /clientes
 * - 3 seeded clients (Cliente Teste 1, 2, 3) appear in the list
 * - axe-core 0 critical violations
 *
 * Out of scope (test.fixme):
 * - Search debounce (300ms) — needs query param wiring + waitForResponse
 * - Detail navigation /clientes/[id]
 * - Notes editor autosave debounce (800ms) + "Salvo ✓" indicator
 * - Soft-delete cycle (and restore via seed.restoreClient in afterEach)
 */
test.describe('clients @hardening @story-2.5', () => {
  test('list page renders seeded clients + 0 critical a11y', async ({
    authedPage: page,
    axe,
  }) => {
    await page.goto('/clientes', { waitUntil: 'domcontentloaded' });

    await expect(
      page.getByRole('heading', { level: 1, name: /clientes/i }),
    ).toBeVisible();

    const main = page.getByRole('main');
    await expect(main.getByText(/cliente teste 1/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(main.getByText(/cliente teste 2/i).first()).toBeVisible();
    await expect(main.getByText(/cliente teste 3/i).first()).toBeVisible();

    await axe.assertNoA11yViolations({ include: 'main' });
  });

  // eslint-disable-next-line playwright/no-skipped-test
  test.fixme(
    'list → search → detail → notes autosave (800ms) → soft-delete cycle',
    () => {
      // TODO: implement after baseline stabilizes. Tracked as 2.5-TEST-001 follow-up.
      // Steps:
      //   1. type partial name → wait debounce 300ms via waitForResponse('clientes?q=...')
      //   2. click client card → navigate /clientes/[id]
      //   3. type into notes editor → wait 800ms autosave → assert "Salvo ✓" indicator
      //   4. reload → notes persisted
      //   5. archive (soft-delete) → confirm dialog → redirect /clientes → client gone
      //   6. seed.restoreClient(clientId) in afterEach to keep fixture intact
    },
  );
});
