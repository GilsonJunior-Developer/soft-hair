// @vitest-environment node
/**
 * Integration tests for `calculateAndPersistCommission` against a real
 * Supabase project (`softhair-dev`). Exercises the same Server Action code
 * path the production app runs — `transitionAppointmentStatus({ to: 'COMPLETED' })`
 * — but with `createClient()` substituted for a service-role client so each
 * call performs a real PostgREST + Postgres roundtrip.
 *
 * Why this suite exists (4.2-TEST-001 — promoted P2 → P1 on 2026-05-03):
 *   The original Story 4.2 helper used PostgREST embedded resources
 *   (`from('appointments').select('..., professionals!inner(...), services!inner(...)')`).
 *   The runtime shape silently differed from what the unit tests' mock client
 *   returned, leaving 5 COMPLETED appointments without commission rows in
 *   production. Hotfix PR #33 rewrote the helper to 3 separate queries —
 *   the team convention captured in `apps/web/app/(dashboard)/agenda/actions.ts`
 *   lines 386-392 ("no PostgREST JOIN — more defensive against introspection
 *   edge cases"). This suite is the regression sentinel for that class of bug:
 *   if anyone re-introduces `!inner(` style embeds the helper will round-trip
 *   to PostgREST for real and the assertions below will catch the resulting
 *   shape mismatch.
 *
 * Skip behaviour:
 *   When `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is missing
 *   (typical in fresh local clones without `.env.local`), the suite skips with
 *   a warning. CI always provides both via secrets so the suite always runs.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  hasIntegrationCredentials,
  TEST_PROFESSIONAL_1_ID,
  TEST_SERVICE_COLORACAO_ID,
  TEST_SERVICE_ESCOVA_ID,
} from './_setup/env';
import { getAdminClient } from './_setup/supabase-admin';
import {
  createAppointment,
  confirmAppointment,
  cleanupAppointment,
  snapshotProfessional,
  setProfessionalCommission,
  upsertProfessionalServiceCommission,
  deleteProfessionalServiceCommission,
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

import { transitionAppointmentStatus } from '@/app/(dashboard)/agenda/actions';

const TEST_TIMEOUT_MS = 30_000;

describe.skipIf(!hasIntegrationCredentials)(
  'commission calculation — real Supabase integration (4.2-TEST-001)',
  () => {
    const admin = hasIntegrationCredentials ? getAdminClient() : null;
    const trackedAppointments: string[] = [];

    afterEach(async () => {
      if (!admin) return;
      while (trackedAppointments.length > 0) {
        const id = trackedAppointments.pop();
        if (id) await cleanupAppointment(admin, id);
      }
    });

    it(
      'PERCENT_FIXED + service override → engine consumer flow writes commission_entries via real PostgREST',
      async () => {
        const a = admin!;

        // Coloração has a 60% override which beats the 50% professional default
        // (Tier 2 in resolveRate). Service price R$ 150 → expected commission R$ 90.
        const seed = await createAppointment(a, {
          professionalId: TEST_PROFESSIONAL_1_ID,
          serviceId: TEST_SERVICE_COLORACAO_ID,
          priceFinalBrl: 150,
        });
        trackedAppointments.push(seed.id);

        await confirmAppointment(a, seed.id);

        const result = await transitionAppointmentStatus({
          appointmentId: seed.id,
          to: 'COMPLETED',
        });
        expect(result.ok).toBe(true);

        const { data: entry, error: entryErr } = await a
          .from('commission_entries')
          .select(
            'appointment_id, professional_id, service_price_brl, percent_applied, commission_amount_brl',
          )
          .eq('appointment_id', seed.id)
          .single();

        expect(entryErr).toBeNull();
        expect(entry).not.toBeNull();
        expect(entry?.appointment_id).toBe(seed.id);
        expect(entry?.professional_id).toBe(TEST_PROFESSIONAL_1_ID);
        expect(Number(entry?.service_price_brl)).toBe(150);
        expect(Number(entry?.percent_applied)).toBe(60);
        expect(Number(entry?.commission_amount_brl)).toBe(90);

        // Denormalised fast-read on appointments must also be populated.
        const { data: appt, error: apptErr } = await a
          .from('appointments')
          .select('commission_calculated_brl, status')
          .eq('id', seed.id)
          .single();

        expect(apptErr).toBeNull();
        expect(appt?.status).toBe('COMPLETED');
        expect(Number(appt?.commission_calculated_brl)).toBe(90);
      },
      TEST_TIMEOUT_MS,
    );

    it(
      'AC5 immutability — mutating professionals.commission_default_percent does NOT touch a prior commission_entries snapshot',
      async () => {
        const a = admin!;
        const original = await snapshotProfessional(a, TEST_PROFESSIONAL_1_ID);

        try {
          // Escova: 50% override == 50% prof default, so the snapshot value of 50%
          // is unambiguous regardless of which tier resolveRate selects.
          // Service price R$ 70 → commission R$ 35.
          const seed = await createAppointment(a, {
            professionalId: TEST_PROFESSIONAL_1_ID,
            serviceId: TEST_SERVICE_ESCOVA_ID,
            priceFinalBrl: 70,
          });
          trackedAppointments.push(seed.id);

          await confirmAppointment(a, seed.id);
          const transitionRes = await transitionAppointmentStatus({
            appointmentId: seed.id,
            to: 'COMPLETED',
          });
          expect(transitionRes.ok).toBe(true);

          const { data: snapBefore } = await a
            .from('commission_entries')
            .select('percent_applied, commission_amount_brl')
            .eq('appointment_id', seed.id)
            .single();
          expect(Number(snapBefore?.percent_applied)).toBe(50);
          expect(Number(snapBefore?.commission_amount_brl)).toBe(35);

          // Mutate the rule — bump default percent dramatically.
          await setProfessionalCommission(a, TEST_PROFESSIONAL_1_ID, {
            commissionDefaultPercent: 99,
          });

          // Re-read: snapshot must be unchanged.
          const { data: snapAfter, error: snapErr } = await a
            .from('commission_entries')
            .select('percent_applied, commission_amount_brl')
            .eq('appointment_id', seed.id)
            .single();
          expect(snapErr).toBeNull();
          expect(Number(snapAfter?.percent_applied)).toBe(50);
          expect(Number(snapAfter?.commission_amount_brl)).toBe(35);
        } finally {
          await setProfessionalCommission(a, TEST_PROFESSIONAL_1_ID, {
            commissionMode: original.commissionMode,
            commissionDefaultPercent: original.commissionDefaultPercent,
          });
        }
      },
      TEST_TIMEOUT_MS,
    );

    it(
      'TABLE mode + per-(professional, service) entry beats the service override (Tier 1)',
      async () => {
        const a = admin!;
        const original = await snapshotProfessional(a, TEST_PROFESSIONAL_1_ID);

        try {
          // Flip the professional to TABLE mode and add a 70% entry for Coloração.
          // Service still has its 60% override (Tier 2) but the entry (Tier 1) wins.
          // Service price R$ 150 → expected commission R$ 105 (70%).
          await setProfessionalCommission(a, TEST_PROFESSIONAL_1_ID, {
            commissionMode: 'TABLE',
          });
          await upsertProfessionalServiceCommission(a, {
            professionalId: TEST_PROFESSIONAL_1_ID,
            serviceId: TEST_SERVICE_COLORACAO_ID,
            percent: 70,
          });

          const seed = await createAppointment(a, {
            professionalId: TEST_PROFESSIONAL_1_ID,
            serviceId: TEST_SERVICE_COLORACAO_ID,
            priceFinalBrl: 150,
          });
          trackedAppointments.push(seed.id);

          await confirmAppointment(a, seed.id);
          const transitionRes = await transitionAppointmentStatus({
            appointmentId: seed.id,
            to: 'COMPLETED',
          });
          expect(transitionRes.ok).toBe(true);

          const { data: entry, error } = await a
            .from('commission_entries')
            .select('percent_applied, commission_amount_brl')
            .eq('appointment_id', seed.id)
            .single();
          expect(error).toBeNull();
          expect(Number(entry?.percent_applied)).toBe(70);
          expect(Number(entry?.commission_amount_brl)).toBe(105);
        } finally {
          await deleteProfessionalServiceCommission(a, {
            professionalId: TEST_PROFESSIONAL_1_ID,
            serviceId: TEST_SERVICE_COLORACAO_ID,
          });
          await setProfessionalCommission(a, TEST_PROFESSIONAL_1_ID, {
            commissionMode: original.commissionMode,
            commissionDefaultPercent: original.commissionDefaultPercent,
          });
        }
      },
      TEST_TIMEOUT_MS,
    );
  },
);
