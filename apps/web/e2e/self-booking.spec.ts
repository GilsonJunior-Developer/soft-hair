import { test, expect } from './fixtures';
import { TEST_SALON } from './fixtures';

/**
 * Story HARD.1 Task 6 — covers Story 2.4 (Client-Facing Self-Booking).
 * Resolves: 2.4-TEST-001 (P0).
 *
 * Scope (Phase 2 minimum-viable):
 * - PUBLIC route render (no login) at /{salon-slug}/{prof-slug}/book
 * - Salon name + professional name visible
 * - At least 1 service from the seeded fixture renders as bookable option
 * - axe-core 0 critical violations on initial step
 *
 * Out of scope (test.fixme — needs deeper flow + JWT email mocking):
 * - Full 3-step flow (date → slot → contact submit)
 * - Timing assertion ≤60s with cap 90s warn-only (RISK-TIMING-2_4 mitigation)
 * - LGPD checkbox required validation
 * - Redirect to /agendamento/{jwt}?justCreated=1 after success
 */
test.describe('public self-booking @hardening @story-2.4', () => {
  test('public booking page renders without login + 0 critical a11y', async ({
    page,
    axe,
  }) => {
    const url = `/${TEST_SALON.slug}/profissional-1/book`;
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Salon name (Salão E2E) somewhere visible
    await expect(page.getByText(/salão e2e/i).first()).toBeVisible({
      timeout: 15_000,
    });

    // Professional name
    await expect(page.getByText(/profissional teste 1/i).first()).toBeVisible();

    // At least one of the 3 seeded services should be presentable
    const main = page.getByRole('main');
    const seenAny = await Promise.race([
      main.getByText(/corte masculino/i).first().waitFor({ state: 'visible', timeout: 8_000 }).then(() => true),
      main.getByText(/coloração/i).first().waitFor({ state: 'visible', timeout: 8_000 }).then(() => true),
      main.getByText(/escova/i).first().waitFor({ state: 'visible', timeout: 8_000 }).then(() => true),
    ]).catch(() => false);
    expect(seenAny).toBe(true);

    await axe.assertNoA11yViolations({ include: 'main' });
  });

  // eslint-disable-next-line playwright/no-skipped-test
  test.fixme(
    'full 3-step flow ≤60s with LGPD checkbox + redirect to /agendamento/{jwt}',
    () => {
      // TODO: implement after baseline stabilizes. Tracked as 2.4-TEST-001 follow-up.
      // Steps:
      //   1. const start = Date.now()
      //   2. Step 1: pick a date in the day strip (data-testid TBD)
      //   3. Step 2: pick a slot
      //   4. Step 3: fill name/email/phone, check LGPD consent
      //   5. Submit + assert redirect /agendamento/{jwt}?justCreated=1
      //   6. const elapsed = Date.now() - start; if (elapsed > 60_000) console.warn(...);
      //      assert elapsed < 90_000 (RISK-TIMING-2_4 cap)
      //   7. Submit-without-LGPD path → assert error visible + form blocked
    },
  );
});
