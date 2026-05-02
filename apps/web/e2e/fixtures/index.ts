import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { assertNoA11yViolations, type AxeOptions } from './axe';

type Axe = {
  /** Run axe against the current page; throws on critical+ violations by default. */
  assertNoA11yViolations: (options?: AxeOptions) => Promise<void>;
};

type Fixtures = {
  axe: Axe;
};

export const test = base.extend<Fixtures>({
  axe: async ({ page }, use) => {
    await use({
      assertNoA11yViolations: (options) => assertNoA11yViolations(page, options),
    });
  },
});

export { expect };
export type { Page };

// PLACEHOLDER FIXTURES — added in Task 2.1 / 2.2 once PREREQ-TEST-USER and
// PREREQ-SUPABASE-SERVICE-ROLE are resolved.
//
//   - authedPage: Page (logged-in test salon owner)
//   - seed: SeedHelpers (seedSalon / seedProfessional / seedService / seedAppointment + cleanup)
//
// Until then, specs that need login/seed should fail loudly via test.fixme()
// rather than silently skip.
