import type { Page } from '@playwright/test';

/**
 * Test user credentials for E2E auth.
 *
 * These credentials exist ONLY in `softhair-dev` (project_id `oywizkjldmxhatvftmho`).
 * Created by Dara on 2026-05-02 via MCP execute_sql. SQL block to recreate is
 * documented in `docs/testing/e2e.md` (section "Seed data + test user").
 *
 * NEVER use this user against production. The password is intentionally in
 * plaintext here to keep DX simple; the only mitigation that matters is that
 * the user does not exist outside dev.
 */
export const TEST_USER = {
  email: 'e2e+test@softhair.com',
  password: 'e2e-test-pwd-2026',
  authId: 'a01c0eda-4938-45fc-afbf-15a12fdd02b4',
  publicUserId: 'a01c0eda-4938-45fc-afbf-15a12fdd02b4',
  defaultSalonId: '4e5b99ca-2fc0-46cd-a634-ef8e5b84a1b7',
} as const;

/**
 * Salon fixture pre-seeded for the test user.
 */
export const TEST_SALON = {
  id: '4e5b99ca-2fc0-46cd-a634-ef8e5b84a1b7',
  slug: 'salao-e2e',
  name: 'Salão E2E',
} as const;

/**
 * Logs the test salon owner in via the email/password form at `/login`.
 *
 * Asserts redirect to a known logged-in route within 15s. Use `domcontentloaded`
 * because Next 15 dev mode HMR keeps `load` from firing (Convention #3 in
 * `docs/testing/e2e.md`).
 */
export async function loginAsTestSalonOwner(page: Page): Promise<void> {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('login-email').fill(TEST_USER.email);
  await page.getByTestId('login-password').fill(TEST_USER.password);
  await page.getByTestId('login-submit').click();
  // Login redirects to the dashboard; wait for any of the known logged-in
  // landing routes to confirm the session cookie was set and middleware let us through.
  await page.waitForURL(
    (url) => /\/(hoje|agenda|profissionais|servicos|clientes|configuracoes)/.test(url.pathname),
    { timeout: 15_000, waitUntil: 'domcontentloaded' },
  );
}
