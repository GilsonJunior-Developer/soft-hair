/**
 * Loads .env.local manually (workspace test context doesn't inherit Next.js
 * env loading) and exposes a `hasIntegrationCredentials` flag so tests can
 * gracefully skip when credentials are missing — same pattern as
 * `packages/db/tests/rls-smoke.test.ts`.
 *
 * In CI the env is provided by GitHub Actions secrets (`NEXT_PUBLIC_SUPABASE_URL`,
 * `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) — `.env.local`
 * is absent there, but the env vars exist in `process.env`, so `loadEnv()` is
 * a no-op and the credentials check passes.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnv(): void {
  const envPath = resolve(__dirname, '../../../../.env.local');
  try {
    const content = readFileSync(envPath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (match && match[1] && !process.env[match[1]]) {
        process.env[match[1]] = (match[2] ?? '').trim();
      }
    }
  } catch (err: unknown) {
    const code = (err as { code?: string } | null)?.code;
    if (code !== 'ENOENT') throw err;
  }
}

loadEnv();

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

export const hasIntegrationCredentials = Boolean(
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY,
);

if (!hasIntegrationCredentials) {
  // eslint-disable-next-line no-console
  console.warn(
    '[integration] Skipping integration tests: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
      'Populate apps/web/.env.local (or set the env vars) to run them locally — see docs/testing/e2e.md.',
  );
}

/**
 * Pinned IDs from the `softhair-dev` test fixture (documented in
 * `docs/testing/e2e.md`). Hardcoded on purpose — the integration suite must
 * fail loudly if the fixture drifts, not silently target a different salon.
 */
export const TEST_SALON_ID = '4e5b99ca-2fc0-46cd-a634-ef8e5b84a1b7';
export const TEST_PROFESSIONAL_1_ID = 'cb2e35ed-140c-4681-bea2-e215a7f472ef'; // 50% default
export const TEST_PROFESSIONAL_2_ID = '71913ddd-d845-4cc9-8457-16aec0ed6adc'; // 60% default
export const TEST_SERVICE_COLORACAO_ID = '07f8ff80-2d6f-4371-a171-6e6ebd4af3be'; // R$150, 60% override
export const TEST_SERVICE_ESCOVA_ID = 'a925c4e8-c0f1-4b17-9c73-0e3d21cb047a'; // R$70, 50% override
export const TEST_SERVICE_CORTE_ID = '6d151058-f522-469e-9aa5-90d8e00aa0ee'; // R$50, 50% override
export const TEST_CLIENT_1_ID = '1deda70b-4a2a-4d7d-ab2b-58c6a1695408';
