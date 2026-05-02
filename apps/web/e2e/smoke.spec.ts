import { test, expect } from './fixtures';

test.describe('smoke @hardening', () => {
  test('homepage loads and renders <html lang="pt-BR">', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  });

  test('homepage has zero critical a11y violations', async ({ page, axe }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await axe.assertNoA11yViolations({ include: 'main' });
  });

  test('healthz returns ok', async ({ request }) => {
    const res = await request.get('/api/healthz');
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });
});
