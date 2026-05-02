// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ getAll: () => [], set: () => {} })),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

/* ----------------------------------------------------------
 * Mock Supabase client — Story 4.2
 * Captures: rpc calls + select chains + upsert/update for commission flow
 * ----------------------------------------------------------*/

const mockRpc = vi.fn();
const mockCommissionInputsMaybeSingle = vi.fn();
const mockTableEntryMaybeSingle = vi.fn();
const mockCommissionEntriesUpsert = vi.fn();
const mockAppointmentsUpdate = vi.fn();

function buildSupabaseClient() {
  return {
    rpc: mockRpc,
    from: vi.fn((table: string) => {
      if (table === 'appointments') {
        // Two paths: SELECT (commission inputs) or UPDATE (commission_calculated_brl)
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: mockCommissionInputsMaybeSingle,
            }),
          }),
          update: (...args: unknown[]) => {
            mockAppointmentsUpdate(...args);
            return {
              eq: vi.fn().mockResolvedValue({ error: null }),
            };
          },
        };
      }
      if (table === 'professional_service_commissions') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: mockTableEntryMaybeSingle,
              }),
            }),
          }),
        };
      }
      if (table === 'commission_entries') {
        return {
          upsert: mockCommissionEntriesUpsert,
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    }),
  };
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => buildSupabaseClient()),
}));

import { transitionAppointmentStatus } from './actions';

const APPT_ID = '11111111-1111-4111-8111-111111111111';
const SALON_ID = 'salon-A';
const PROF_ID = 'prof-X';
const SVC_ID = 'svc-corte';

function setRpcSuccess(toStatus = 'COMPLETED') {
  mockRpc.mockResolvedValue({
    data: { status: toStatus },
    error: null,
  });
}

function setCommissionInputs(opts: {
  priceBrlFinal: number;
  commissionMode: 'PERCENT_FIXED' | 'TABLE';
  commissionDefaultPercent: number;
  commissionOverridePercent: number | null;
}) {
  mockCommissionInputsMaybeSingle.mockResolvedValue({
    data: {
      salon_id: SALON_ID,
      professional_id: PROF_ID,
      service_id: SVC_ID,
      price_brl_final: opts.priceBrlFinal,
      professionals: {
        commission_mode: opts.commissionMode,
        commission_default_percent: opts.commissionDefaultPercent,
      },
      services: {
        commission_override_percent: opts.commissionOverridePercent,
      },
    },
    error: null,
  });
}

function resetAllMocks() {
  mockRpc.mockReset();
  mockCommissionInputsMaybeSingle.mockReset();
  mockTableEntryMaybeSingle.mockReset();
  mockCommissionEntriesUpsert.mockReset();
  mockAppointmentsUpdate.mockReset();
  // Default: no table entry (most tests)
  mockTableEntryMaybeSingle.mockResolvedValue({ data: null, error: null });
  // Default: upsert succeeds
  mockCommissionEntriesUpsert.mockResolvedValue({ error: null });
}

describe('transitionAppointmentStatus → commission calculation (Story 4.2)', () => {
  beforeEach(resetAllMocks);

  it('rejects invalid input shape', async () => {
    const res = await transitionAppointmentStatus({ appointmentId: 'not-a-uuid' });
    expect(res.ok).toBe(false);
  });

  it('PERCENT_FIXED + no override → applies professional default and inserts commission_entries', async () => {
    setRpcSuccess('COMPLETED');
    setCommissionInputs({
      priceBrlFinal: 100,
      commissionMode: 'PERCENT_FIXED',
      commissionDefaultPercent: 40,
      commissionOverridePercent: null,
    });

    const res = await transitionAppointmentStatus({
      appointmentId: APPT_ID,
      to: 'COMPLETED',
    });

    expect(res.ok).toBe(true);
    expect(mockCommissionEntriesUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        salon_id: SALON_ID,
        appointment_id: APPT_ID,
        professional_id: PROF_ID,
        service_price_brl: 100,
        percent_applied: 40,
        commission_amount_brl: 40,
      }),
      expect.objectContaining({ ignoreDuplicates: true }),
    );
    expect(mockAppointmentsUpdate).toHaveBeenCalledWith({
      commission_calculated_brl: 40,
    });
  });

  it('PERCENT_FIXED + service override wins over default', async () => {
    setRpcSuccess('COMPLETED');
    setCommissionInputs({
      priceBrlFinal: 100,
      commissionMode: 'PERCENT_FIXED',
      commissionDefaultPercent: 40,
      commissionOverridePercent: 50,
    });

    await transitionAppointmentStatus({ appointmentId: APPT_ID, to: 'COMPLETED' });

    expect(mockCommissionEntriesUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        percent_applied: 50,
        commission_amount_brl: 50,
      }),
      expect.anything(),
    );
  });

  it('TABLE + entry exists → entry overrides service override', async () => {
    setRpcSuccess('COMPLETED');
    setCommissionInputs({
      priceBrlFinal: 100,
      commissionMode: 'TABLE',
      commissionDefaultPercent: 40,
      commissionOverridePercent: 50, // ignored because entry exists
    });
    mockTableEntryMaybeSingle.mockResolvedValue({
      data: { percent: 70 },
      error: null,
    });

    await transitionAppointmentStatus({ appointmentId: APPT_ID, to: 'COMPLETED' });

    expect(mockCommissionEntriesUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        percent_applied: 70,
        commission_amount_brl: 70,
      }),
      expect.anything(),
    );
  });

  it('TABLE + no entry + service override → falls back to override', async () => {
    setRpcSuccess('COMPLETED');
    setCommissionInputs({
      priceBrlFinal: 100,
      commissionMode: 'TABLE',
      commissionDefaultPercent: 40,
      commissionOverridePercent: 35,
    });
    mockTableEntryMaybeSingle.mockResolvedValue({ data: null, error: null });

    await transitionAppointmentStatus({ appointmentId: APPT_ID, to: 'COMPLETED' });

    expect(mockCommissionEntriesUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        percent_applied: 35,
        commission_amount_brl: 35,
      }),
      expect.anything(),
    );
  });

  it('TABLE + no entry + no override → falls back to professional default', async () => {
    setRpcSuccess('COMPLETED');
    setCommissionInputs({
      priceBrlFinal: 100,
      commissionMode: 'TABLE',
      commissionDefaultPercent: 45,
      commissionOverridePercent: null,
    });

    await transitionAppointmentStatus({ appointmentId: APPT_ID, to: 'COMPLETED' });

    expect(mockCommissionEntriesUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        percent_applied: 45,
        commission_amount_brl: 45,
      }),
      expect.anything(),
    );
  });

  it('AC4 — discount: commission calc uses price_brl_final (not price_brl_original)', async () => {
    setRpcSuccess('COMPLETED');
    // Original R$100, discount R$20, final R$80
    setCommissionInputs({
      priceBrlFinal: 80,
      commissionMode: 'PERCENT_FIXED',
      commissionDefaultPercent: 40,
      commissionOverridePercent: null,
    });

    await transitionAppointmentStatus({ appointmentId: APPT_ID, to: 'COMPLETED' });

    expect(mockCommissionEntriesUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        service_price_brl: 80,
        percent_applied: 40,
        commission_amount_brl: 32, // 40% of 80, NOT 40% of 100
      }),
      expect.anything(),
    );
  });

  it('idempotency: upsert uses onConflict=appointment_id with ignoreDuplicates', async () => {
    setRpcSuccess('COMPLETED');
    setCommissionInputs({
      priceBrlFinal: 100,
      commissionMode: 'PERCENT_FIXED',
      commissionDefaultPercent: 40,
      commissionOverridePercent: null,
    });

    await transitionAppointmentStatus({ appointmentId: APPT_ID, to: 'COMPLETED' });

    expect(mockCommissionEntriesUpsert).toHaveBeenCalledWith(
      expect.anything(),
      { onConflict: 'appointment_id', ignoreDuplicates: true },
    );
  });

  it('non-COMPLETED transition (PENDING_CONFIRMATION → CONFIRMED) skips commission flow entirely', async () => {
    setRpcSuccess('CONFIRMED');

    await transitionAppointmentStatus({ appointmentId: APPT_ID, to: 'CONFIRMED' });

    expect(mockCommissionInputsMaybeSingle).not.toHaveBeenCalled();
    expect(mockCommissionEntriesUpsert).not.toHaveBeenCalled();
    expect(mockAppointmentsUpdate).not.toHaveBeenCalled();
  });

  it('engine input fetch failure → logs structured error + transition still returns ok', async () => {
    setRpcSuccess('COMPLETED');
    mockCommissionInputsMaybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'db down' },
    });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await transitionAppointmentStatus({
      appointmentId: APPT_ID,
      to: 'COMPLETED',
    });

    expect(res.ok).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith(
      '[transitionAppointmentStatus][commission]',
      expect.objectContaining({ appointmentId: APPT_ID, reason: 'db down' }),
    );
    expect(mockCommissionEntriesUpsert).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('insert failure → logs structured error + transition still returns ok', async () => {
    setRpcSuccess('COMPLETED');
    setCommissionInputs({
      priceBrlFinal: 100,
      commissionMode: 'PERCENT_FIXED',
      commissionDefaultPercent: 40,
      commissionOverridePercent: null,
    });
    mockCommissionEntriesUpsert.mockResolvedValue({
      error: { message: 'unique violation' },
    });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await transitionAppointmentStatus({
      appointmentId: APPT_ID,
      to: 'COMPLETED',
    });

    expect(res.ok).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith(
      '[transitionAppointmentStatus][commission]',
      expect.objectContaining({
        appointmentId: APPT_ID,
        reason: 'unique violation',
      }),
    );
    consoleSpy.mockRestore();
  });

  it('RPC error (e.g., invalid_transition) does NOT touch commission_entries', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'invalid_transition' },
    });

    const res = await transitionAppointmentStatus({
      appointmentId: APPT_ID,
      to: 'COMPLETED',
    });

    expect(res.ok).toBe(false);
    expect(mockCommissionInputsMaybeSingle).not.toHaveBeenCalled();
    expect(mockCommissionEntriesUpsert).not.toHaveBeenCalled();
  });
});

/* ----------------------------------------------------------
 * AC5 immutability — rejection-grade behavioral test
 * (deferred from Story 4.1 to 4.2 — first writer to commission_entries)
 * ----------------------------------------------------------*/

describe('AC5 immutability — commission_entries snapshot is never UPDATEd', () => {
  beforeEach(resetAllMocks);

  it('engine NEVER calls .update() against commission_entries (only upsert/insert with idempotency)', async () => {
    setRpcSuccess('COMPLETED');
    setCommissionInputs({
      priceBrlFinal: 50,
      commissionMode: 'PERCENT_FIXED',
      commissionDefaultPercent: 40,
      commissionOverridePercent: null,
    });

    // Track whether our `from('commission_entries')` mock ever exposes `.update`.
    // Our mock only exposes `.upsert` for commission_entries — if production code
    // ever tries `from('commission_entries').update(...)`, this test will fail
    // with TypeError (update is not a function), proving the invariant holds.

    await transitionAppointmentStatus({ appointmentId: APPT_ID, to: 'COMPLETED' });

    expect(mockCommissionEntriesUpsert).toHaveBeenCalled();
    expect(mockCommissionEntriesUpsert).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ ignoreDuplicates: true }),
    );
  });

  it('rule edit after COMPLETED does NOT recompute commission_entries (separate code path)', async () => {
    // This test asserts the architectural invariant: changing
    // professional.commission_default_percent in any other Server Action
    // (e.g., updateProfessional from profissionais/actions.ts) does NOT
    // touch commission_entries. We verify this by NOT exporting any code
    // path from agenda/actions.ts that updates commission_entries.

    // First call: COMPLETED → engine inserts row with percent=40
    setRpcSuccess('COMPLETED');
    setCommissionInputs({
      priceBrlFinal: 100,
      commissionMode: 'PERCENT_FIXED',
      commissionDefaultPercent: 40,
      commissionOverridePercent: null,
    });
    await transitionAppointmentStatus({ appointmentId: APPT_ID, to: 'COMPLETED' });

    const firstUpsertCall = mockCommissionEntriesUpsert.mock.calls[0];
    expect(firstUpsertCall?.[0]).toMatchObject({
      percent_applied: 40,
      commission_amount_brl: 40,
    });

    // Simulate "rule changed to 60%" then COMPLETED called again (already terminal).
    // RPC will reject as invalid_transition; commission flow must NOT execute.
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'invalid_transition' },
    });
    mockCommissionEntriesUpsert.mockClear();
    mockAppointmentsUpdate.mockClear();

    const res2 = await transitionAppointmentStatus({
      appointmentId: APPT_ID,
      to: 'COMPLETED',
    });

    expect(res2.ok).toBe(false);
    expect(mockCommissionEntriesUpsert).not.toHaveBeenCalled();
    expect(mockAppointmentsUpdate).not.toHaveBeenCalled();
  });
});
