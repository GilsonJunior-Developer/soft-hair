import { test, expect } from './fixtures';

/**
 * Story HARD.1 Task 5 — covers Story 1.7 (Empty Dashboard Hoje).
 * Resolves: 1.7-TEST-001 (P0) + 1.7-TEST-002 (P0, axe-core).
 *
 * Scope (Phase 2 minimum-viable):
 * - Authenticated render of /hoje
 * - Empty state visible (Story 1.7 was the EMPTY dashboard story explicitly)
 * - 3 metric cards present
 * - axe-core 0 critical violations
 *
 * Note: /hoje currently has metric values hardcoded to "0" / "R$ 0,00" / "—"
 * (no DB query yet). Populated-state testing waits for the data-fetching wiring
 * to land in a future story. Until then, test.fixme below documents the gap.
 */
test.describe('dashboard hoje @hardening @story-1.7', () => {
  test('empty state renders + 3 metric cards + 0 critical a11y', async ({
    authedPage: page,
    axe,
  }) => {
    await page.goto('/hoje', { waitUntil: 'domcontentloaded' });

    // Greeting heading: "Bom dia, X 👋" / "Boa tarde, X 👋" / "Boa noite, X 👋"
    await expect(
      page.getByRole('heading', { level: 1, name: /bom dia|boa tarde|boa noite/i }),
    ).toBeVisible();

    // 3 metric cards (semantic: <article> inside region "Resumo do dia")
    const summaryRegion = page.getByRole('region', { name: /resumo do dia/i });
    await expect(summaryRegion).toBeVisible();
    const metricCards = summaryRegion.locator('article');
    await expect(metricCards).toHaveCount(3);

    // Metric labels
    await expect(summaryRegion.getByText(/agendamentos hoje/i)).toBeVisible();
    await expect(summaryRegion.getByText(/faturamento previsto/i)).toBeVisible();
    await expect(summaryRegion.getByText(/taxa de ocupação/i)).toBeVisible();

    // Empty state (Story 1.7 owns)
    const upcomingRegion = page.getByRole('region', { name: /próximos agendamentos/i });
    await expect(
      upcomingRegion.getByText(/nenhum agendamento hoje ainda/i),
    ).toBeVisible();

    await axe.assertNoA11yViolations({ include: 'main' });
  });

  // eslint-disable-next-line playwright/no-skipped-test
  test.fixme(
    'populated state — 3 appointments seeded for today render in chronological order',
    () => {
      // TODO: implement after /hoje is wired to query appointments table.
      // Today the metric values + the "Próximos" list are hardcoded to empty state.
      // Tracked: 1.7-TEST-001 follow-up + the missing data-fetch wiring.
    },
  );
});
