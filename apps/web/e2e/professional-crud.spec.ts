import { test, expect } from './fixtures';

/**
 * Story HARD.1 Task 3 — covers Story 1.5 (Professional Profile Setup).
 * Resolves: 1.5-TEST-001 (P0).
 *
 * Scope (Phase 2 minimum-viable):
 * - Authenticated render of /profissionais
 * - axe-core 0 critical violations
 * - Header heading + the existing test fixture professionals visible
 * - Create flow reaches /profissionais/novo with form rendered
 *
 * Out of scope here (tracked as test.fixme below for follow-up):
 * - Full create → edit → soft-delete cycle
 * - Boundary 1-20 limit (requires seeding 19 extra professionals; expensive setup)
 * - Slug regex edge validation
 */
test.describe('professionals @hardening @story-1.5', () => {
  test('list page renders with seeded professionals + 0 critical a11y', async ({
    authedPage: page,
    axe,
  }) => {
    await page.goto('/profissionais', { waitUntil: 'domcontentloaded' });

    await expect(
      page.getByRole('heading', { level: 1, name: /profissionais/i }),
    ).toBeVisible();

    await expect(page.getByTestId('professionals-add-cta')).toBeVisible();

    const cards = page.getByTestId('professional-card');
    await expect(cards).toHaveCount(2, { timeout: 10_000 });

    const slugs = await cards.evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-prof-slug')),
    );
    expect(slugs).toEqual(expect.arrayContaining(['profissional-1', 'profissional-2']));

    await axe.assertNoA11yViolations({ include: 'main' });
  });

  test('add CTA navigates to /profissionais/novo with form rendered', async ({
    authedPage: page,
    axe,
  }) => {
    await page.goto('/profissionais', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('professionals-add-cta').click();
    await page.waitForURL('**/profissionais/novo', { waitUntil: 'domcontentloaded' });

    await expect(
      page.getByRole('heading', { level: 1, name: /novo profissional/i }),
    ).toBeVisible();
    await expect(page.getByTestId('prof-form-name')).toBeVisible();
    await expect(page.getByTestId('prof-form-slug')).toBeVisible();
    await expect(page.getByTestId('prof-form-submit')).toBeVisible();

    await axe.assertNoA11yViolations({ include: 'main' });
  });

  // eslint-disable-next-line playwright/no-skipped-test
  test.fixme(
    'full CRUD cycle: create → edit commission → soft-delete + boundary 1-20',
    () => {
      // TODO: implement after baseline stabilizes. Tracked as 1.5-TEST-001 follow-up.
      // Steps:
      //   1. Click prof-form-name + prof-form-slug + commission, submit
      //   2. Assert redirect /profissionais and new card present
      //   3. Click new card → edit page → change commission → save
      //   4. Verify update persisted (refresh + assert)
      //   5. Soft-delete via edit page → verify card gone from list
      //   6. Boundary: seed 19 extras via service role → assert add CTA disabled or rejects 21st
    },
  );
});
