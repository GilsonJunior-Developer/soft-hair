/**
 * Fixture helpers for the commission integration tests.
 *
 * Cleanup model:
 * - Each test creates a fresh appointment with a far-future `scheduled_at`
 *   (year 2099+) and a unique `idempotency_key`, then drives it through
 *   PENDING_CONFIRMATION → CONFIRMED → COMPLETED via the production code path.
 * - Cleanup deletes the related `commission_entries` row (no immutability
 *   trigger blocks DELETE there) and soft-deletes the appointment via
 *   `deleted_at`. We deliberately do NOT cascade-delete the appointment row
 *   because the `appointment_status_log` immutability trigger
 *   (`prevent_credits_log_mutation`) also blocks CASCADE deletes. Status-log
 *   rows accumulating in dev is acceptable — they are audit data.
 */

import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { TEST_SALON_ID, TEST_CLIENT_1_ID } from './env';

export type AppointmentSeed = {
  id: string;
  scheduledAt: string;
  professionalId: string;
  serviceId: string;
  clientId: string;
  priceFinalBrl: number;
  idempotencyKey: string;
};

export type CreateAppointmentOptions = {
  professionalId: string;
  serviceId: string;
  /** Final BRL price — also written to price_brl_original (no discount). */
  priceFinalBrl: number;
  /** Optional offset (in days) from a fixed 2099 base date — keeps tests collision-free. */
  scheduleOffsetDays?: number;
};

/**
 * Inserts a `PENDING_CONFIRMATION` appointment using service role (bypasses RLS).
 * Caller is responsible for transitioning to CONFIRMED then COMPLETED via the
 * production code path under test.
 */
export async function createAppointment(
  admin: SupabaseClient,
  opts: CreateAppointmentOptions,
): Promise<AppointmentSeed> {
  // Per-call random slot in the year-2099+ range (~100-year window). Collision
  // probability with N=50 inserts in a 5.25M-slot window is < 0.001%. This
  // replaces a shared module-level `scheduleSlot` counter that collided across
  // vitest workers (each worker had its own counter starting at 0, hitting
  // the same time slots and tripping the exclusion constraint).
  const scheduledAt = pickRandomFutureSlot().toISOString();

  const idempotencyKey = `integration-test-${randomUUID()}`;
  const cancelToken = randomUUID().replace(/-/g, '');

  const { data, error } = await admin
    .from('appointments')
    .insert({
      salon_id: TEST_SALON_ID,
      professional_id: opts.professionalId,
      service_id: opts.serviceId,
      client_id: TEST_CLIENT_1_ID,
      scheduled_at: scheduledAt,
      duration_minutes: 30,
      status: 'PENDING_CONFIRMATION',
      price_brl_original: opts.priceFinalBrl,
      price_brl_discount: 0,
      price_brl_final: opts.priceFinalBrl,
      source: 'MANUAL_BY_STAFF',
      cancel_token: cancelToken,
      idempotency_key: idempotencyKey,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(
      `[fixtures] createAppointment failed: ${error?.message ?? 'no data'}`,
    );
  }

  return {
    id: data.id as string,
    scheduledAt,
    professionalId: opts.professionalId,
    serviceId: opts.serviceId,
    clientId: TEST_CLIENT_1_ID,
    priceFinalBrl: opts.priceFinalBrl,
    idempotencyKey,
  };
}

/**
 * Drives appointment from PENDING_CONFIRMATION → CONFIRMED via the RPC,
 * since the state machine requires this step before COMPLETED is allowed.
 */
export async function confirmAppointment(
  admin: SupabaseClient,
  appointmentId: string,
): Promise<void> {
  const { error } = await admin.rpc('transition_appointment_status', {
    p_appointment_id: appointmentId,
    p_to: 'CONFIRMED',
  });
  if (error) {
    throw new Error(
      `[fixtures] confirmAppointment failed: ${error.message}`,
    );
  }
}

/**
 * Soft-deletes the appointment + hard-deletes related commission rows.
 * Also flips status to CANCELED so the `appointments_no_professional_overlap`
 * exclusion constraint releases the time slot — without this, soft-deleted
 * PENDING/CONFIRMED appointments accumulate as zombies that block future
 * test fixtures at the same scheduled_at + professional combo (regression
 * detected during Story 4.3 4.2-TEST-001 follow-up).
 *
 * Safe to call even if no commission row exists. Errors are logged but
 * not rethrown — cleanup must never mask the real test failure.
 */
export async function cleanupAppointment(
  admin: SupabaseClient,
  appointmentId: string,
): Promise<void> {
  const { error: ceErr } = await admin
    .from('commission_entries')
    .delete()
    .eq('appointment_id', appointmentId);
  if (ceErr) {
    // eslint-disable-next-line no-console
    console.warn(
      `[fixtures] cleanup commission_entries warning: ${ceErr.message}`,
    );
  }

  const { error: aptErr } = await admin
    .from('appointments')
    .update({
      status: 'CANCELED',
      deleted_at: new Date().toISOString(),
    })
    .eq('id', appointmentId);
  if (aptErr) {
    // eslint-disable-next-line no-console
    console.warn(
      `[fixtures] cleanup appointment warning: ${aptErr.message}`,
    );
  }
}

/**
 * Captures a professional's commission columns so a test can mutate them
 * (immutability test, table-mode flip) and restore the original state in
 * its `finally` block.
 */
export async function snapshotProfessional(
  admin: SupabaseClient,
  professionalId: string,
): Promise<{ commissionMode: string; commissionDefaultPercent: number }> {
  const { data, error } = await admin
    .from('professionals')
    .select('commission_mode, commission_default_percent')
    .eq('id', professionalId)
    .maybeSingle();

  if (error || !data) {
    throw new Error(
      `[fixtures] snapshotProfessional failed: ${error?.message ?? 'not found'}`,
    );
  }
  return {
    commissionMode: String(data.commission_mode),
    commissionDefaultPercent: Number(data.commission_default_percent),
  };
}

export async function setProfessionalCommission(
  admin: SupabaseClient,
  professionalId: string,
  patch: { commissionMode?: string; commissionDefaultPercent?: number },
): Promise<void> {
  const update: Record<string, unknown> = {};
  if (patch.commissionMode !== undefined) {
    update.commission_mode = patch.commissionMode;
  }
  if (patch.commissionDefaultPercent !== undefined) {
    update.commission_default_percent = patch.commissionDefaultPercent;
  }
  const { error } = await admin
    .from('professionals')
    .update(update)
    .eq('id', professionalId);
  if (error) {
    throw new Error(
      `[fixtures] setProfessionalCommission failed: ${error.message}`,
    );
  }
}

export async function upsertProfessionalServiceCommission(
  admin: SupabaseClient,
  args: { professionalId: string; serviceId: string; percent: number },
): Promise<void> {
  const { error } = await admin
    .from('professional_service_commissions')
    .upsert(
      {
        salon_id: TEST_SALON_ID,
        professional_id: args.professionalId,
        service_id: args.serviceId,
        percent: args.percent,
      },
      { onConflict: 'professional_id,service_id' },
    );
  if (error) {
    throw new Error(
      `[fixtures] upsertProfessionalServiceCommission failed: ${error.message}`,
    );
  }
}

export async function deleteProfessionalServiceCommission(
  admin: SupabaseClient,
  args: { professionalId: string; serviceId: string },
): Promise<void> {
  const { error } = await admin
    .from('professional_service_commissions')
    .delete()
    .eq('professional_id', args.professionalId)
    .eq('service_id', args.serviceId);
  if (error) {
    // eslint-disable-next-line no-console
    console.warn(
      `[fixtures] deleteProfessionalServiceCommission warning: ${error.message}`,
    );
  }
}

/**
 * Picks a random 30-minute slot in the year 2099–2199 window. Aligned to
 * 30-minute boundaries for visual sanity in the DB; alignment is not
 * functionally required by the schema. See {@link createAppointment} comment
 * for the collision-probability rationale.
 */
function pickRandomFutureSlot(): Date {
  const baseEpochMs = Date.UTC(2099, 0, 1, 0, 0, 0);
  const windowMs = 100 * 365 * 24 * 60 * 60 * 1000; // ~100 years
  const slotMs = 30 * 60 * 1000;
  const offset = Math.floor(Math.random() * windowMs);
  const aligned = Math.floor(offset / slotMs) * slotMs;
  return new Date(baseEpochMs + aligned);
}
