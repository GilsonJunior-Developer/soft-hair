import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { assertNoA11yViolations, type AxeOptions } from './axe';
import { loginAsTestSalonOwner } from './auth';
import { createSeedHelpers, type SeedHelpers } from './seed';

type Axe = {
  /** Run axe against the current page; throws on critical+ violations by default. */
  assertNoA11yViolations: (options?: AxeOptions) => Promise<void>;
};

type Fixtures = {
  axe: Axe;
  /** A page that has already been logged in as the test salon owner. */
  authedPage: Page;
  /** Service-role helpers to seed and clean per-spec data. Cleans automatically after the test. */
  seed: SeedHelpers;
};

export const test = base.extend<Fixtures>({
  axe: async ({ page }, use) => {
    await use({
      assertNoA11yViolations: (options) => assertNoA11yViolations(page, options),
    });
  },
  authedPage: async ({ page }, use) => {
    await loginAsTestSalonOwner(page);
    await use(page);
  },
  seed: async ({}, use) => {
    const helpers = createSeedHelpers();
    await use(helpers);
    await helpers.cleanupAll();
  },
});

export { expect };
export type { Page };
export { TEST_USER, TEST_SALON } from './auth';
