import { test, expect } from './fixtures';

/**
 * Story 4.3 Task 9 — happy-path E2E for the Monthly Commission Report.
 *
 * Scope (deliberate minimum-viable):
 *   - Authenticated render of /comissao
 *   - Aggregate table OR empty-state visible (test salon may be empty
 *     depending on prior runs)
 *   - Filter form present + accessible
 *   - Quick-preset buttons present
 *   - Export buttons present (CSV + Print)
 *   - axe-core 0 critical violations
 *
 * Out of scope:
 *   - Print dialog interaction (browsers can't programmatically capture
 *     print previews — print-CSS verified manually)
 *   - End-to-end CSV download wiring (test salon may have empty period →
 *     button disabled)
 */
test.describe('commission report @story-4.3', () => {
  test('renders /comissao with filter + table or empty state + 0 critical a11y', async ({
    authedPage: page,
    axe,
  }) => {
    await page.goto('/comissao', { waitUntil: 'domcontentloaded' });

    // Heading
    await expect(
      page.getByRole('heading', { level: 1, name: /comissão/i }),
    ).toBeVisible();

    // Filter form must be present.
    const filter = page.getByTestId('commission-filter');
    await expect(filter).toBeVisible();

    // Quick presets present (3 buttons).
    await expect(filter.getByRole('button', { name: /mês corrente/i })).toBeVisible();
    await expect(filter.getByRole('button', { name: /mês anterior/i })).toBeVisible();
    await expect(filter.getByRole('button', { name: /últimos 30 dias/i })).toBeVisible();

    // Date inputs.
    await expect(page.getByTestId('commission-filter-from')).toBeVisible();
    await expect(page.getByTestId('commission-filter-to')).toBeVisible();

    // Export buttons.
    await expect(page.getByTestId('commission-export-csv')).toBeVisible();
    await expect(page.getByTestId('commission-print')).toBeVisible();

    // Either aggregate table OR empty state — both valid initial states.
    const aggregate = page.getByTestId('commission-aggregate-table');
    const empty = page.getByTestId('commission-empty');
    const aggregateOrEmpty = aggregate.or(empty);
    await expect(aggregateOrEmpty.first()).toBeVisible();

    // a11y gate.
    await axe.assertNoA11yViolations({ include: 'main' });
  });

  test('quick-preset "Mês anterior" navigates with adjusted searchParams', async ({
    authedPage: page,
  }) => {
    await page.goto('/comissao', { waitUntil: 'domcontentloaded' });

    await page
      .getByTestId('commission-filter')
      .getByRole('button', { name: /mês anterior/i })
      .click();

    // Wait for the URL to reflect the navigation.
    await page.waitForURL(/\/comissao\?from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}/);

    // Period heading text in the report header should now show some date.
    await expect(
      page.getByText(/período:/i),
    ).toBeVisible();
  });
});
