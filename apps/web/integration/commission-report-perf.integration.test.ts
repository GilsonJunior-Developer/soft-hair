// @vitest-environment node
/**
 * Integration test for `fetchCommissionReportSummary` against real Supabase
 * (`softhair-dev`) — Story 4.3 Task 8 (AC5 perf budget sentinel).
 *
 * What it verifies:
 *   - End-to-end flow from Server Action → real PostgREST → JS reduce works
 *   - Wall-clock for ~50 commission_entries stays < 500ms (10% of the AC5
 *     budget at 50/500 fraction; loose sentinel, not a benchmark)
 *
 * What it does NOT verify (covered elsewhere):
 *   - Functional correctness of aggregation (covered by Vitest unit tests in
 *     `actions.test.ts`)
 *   - The COMPLETED → commission_entries write path (Story 4.2 +
 *     `commission-calculation.integration.test.ts`)
 *
 * Why we bypass the writer for setup: the Story 4.2 writer triggers RPC
 * `transition_appointment_status` which serialises via FOR UPDATE row-lock.
 * 50 sequential transitions ≈ 150s — too slow for CI. Direct service-role
 * bulk insert into commission_entries simulates the same end-state in <1s.
 *
 * Skip behaviour mirrors `commission-calculation.integration.test.ts`:
 * `describe.skipIf(!hasIntegrationCredentials)` so PRs from forks pass.
 */

import { randomUUID } from 'node:crypto';
import { describe, it, expect, vi, afterAll } from 'vitest';
import {
  hasIntegrationCredentials,
  TEST_PROFESSIONAL_1_ID,
  TEST_SALON_ID,
  TEST_SERVICE_COLORACAO_ID,
} from './_setup/env';
import { getAdminClient } from './_setup/supabase-admin';
import {
  createAppointment,
  cleanupAppointment,
} from './_setup/fixtures';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => getAdminClient()),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ getAll: () => [], set: () => {} })),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { fetchCommissionReportSummary } from '@/app/(dashboard)/comissao/actions';

const TEST_TIMEOUT_MS = 60_000;
const FIXTURE_COUNT = 50;
const PERF_BUDGET_MS = 500;

describe.skipIf(!hasIntegrationCredentials)(
  'commission report — real Supabase integration (4.3 Task 8 perf sentinel)',
  () => {
    const admin = hasIntegrationCredentials ? getAdminClient() : null;
    const trackedAppointments: string[] = [];
    const trackedCommissionEntries: string[] = [];

    afterAll(async () => {
      if (!admin) return;
      // Hard-delete commission_entries first (no trigger blocks DELETE here).
      if (trackedCommissionEntries.length > 0) {
        const { error } = await admin
          .from('commission_entries')
          .delete()
          .in('id', trackedCommissionEntries);
        if (error) {
          // eslint-disable-next-line no-console
          console.warn('[perf-test cleanup] commission_entries:', error.message);
        }
      }
      // Soft-delete appointments (cascade DELETE blocked by status_log
      // immutability trigger — see fixtures.ts).
      while (trackedAppointments.length > 0) {
        const id = trackedAppointments.pop();
        if (id) await cleanupAppointment(admin, id);
      }
    }, TEST_TIMEOUT_MS);

    it(
      'aggregates ~50 commission_entries in well under 500ms (AC5 perf sentinel)',
      async () => {
        const a = admin!;

        // 1. Insert 50 appointments. Track each ID immediately on success so
        //    a partial failure leaks zero rows. Sequential awaits (cheap at
        //    50 iterations against softhair-dev) avoid Promise.all reject
        //    semantics that would orphan rows already inserted before a
        //    later one threw.
        const seeds: Awaited<ReturnType<typeof createAppointment>>[] = [];
        for (let i = 0; i < FIXTURE_COUNT; i++) {
          const seed = await createAppointment(a, {
            professionalId: TEST_PROFESSIONAL_1_ID,
            serviceId: TEST_SERVICE_COLORACAO_ID,
            priceFinalBrl: 150,
          });
          trackedAppointments.push(seed.id);
          seeds.push(seed);
        }

        // 2. Bulk insert commission_entries via service role (simulates the
        //    end-state Story 4.2's writer would produce, ~150x faster).
        const ceRows = seeds.map((s) => ({
          id: randomUUID(),
          salon_id: TEST_SALON_ID,
          appointment_id: s.id,
          professional_id: TEST_PROFESSIONAL_1_ID,
          service_price_brl: 150,
          percent_applied: 60,
          commission_amount_brl: 90,
        }));
        const { error: insertErr } = await a
          .from('commission_entries')
          .insert(ceRows);
        if (insertErr) {
          throw new Error(
            `[perf-test setup] bulk insert failed: ${insertErr.message}`,
          );
        }
        for (const row of ceRows) trackedCommissionEntries.push(row.id);

        // 3. Wide-enough window to cover the inserts. Using a 5-minute
        //    look-back means concurrent test inserts (within the same window)
        //    may inflate the result — perf test asserts >= FIXTURE_COUNT.
        const now = new Date();
        const from = new Date(now.getTime() - 5 * 60 * 1000);
        const to = new Date(now.getTime() + 5 * 60 * 1000);

        const start = performance.now();
        const res = await fetchCommissionReportSummary({ from, to });
        const elapsed = performance.now() - start;

        expect(res.ok).toBe(true);
        if (!res.ok) return;

        // Functional sanity (loose because concurrent inserts may lift count):
        expect(res.data.totals.appointments).toBeGreaterThanOrEqual(
          FIXTURE_COUNT,
        );
        expect(res.data.rows.length).toBeGreaterThanOrEqual(1);
        const ourProf = res.data.rows.find(
          (r) => r.professionalId === TEST_PROFESSIONAL_1_ID,
        );
        expect(ourProf).toBeDefined();
        expect(ourProf!.appointments).toBeGreaterThanOrEqual(FIXTURE_COUNT);

        // Wall-clock sentinel — purpose of this test.
        // eslint-disable-next-line no-console
        console.log(
          `[perf-test] aggregation of ${res.data.totals.appointments} entries: ${elapsed.toFixed(1)}ms`,
        );
        expect(elapsed).toBeLessThan(PERF_BUDGET_MS);
      },
      TEST_TIMEOUT_MS,
    );
  },
);
