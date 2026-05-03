/**
 * Service-role Supabase client for integration tests.
 *
 * This client bypasses RLS — used to set up fixtures and to substitute the
 * production `createClient()` so Server Actions execute against a real
 * Postgres / PostgREST roundtrip (the whole point of this suite).
 *
 * Bypassing RLS is acceptable for this test suite because the bug we are
 * defending against (PostgREST embed shape mismatch — Story 4.2 PR #33
 * hotfix) is in query syntax, not RLS coverage. RLS is exercised separately
 * by `packages/db/tests/rls-smoke.test.ts`.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  hasIntegrationCredentials,
} from './env';

let cachedAdmin: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (!hasIntegrationCredentials) {
    throw new Error(
      'getAdminClient called without integration credentials — ' +
        'guard with hasIntegrationCredentials before calling.',
    );
  }
  if (!cachedAdmin) {
    cachedAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return cachedAdmin;
}
