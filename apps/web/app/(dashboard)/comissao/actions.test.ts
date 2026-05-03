// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ getAll: () => [], set: () => {} })),
}));

/* ----------------------------------------------------------
 * Mock Supabase client builder — supports the 4 tables touched
 * by the report Server Actions.
 *
 * Convention: any chain that does .select().eq() OR .gte().lt() returns a
 * thenable that resolves to the configured `data`/`error`. Methods are
 * captured so we can assert call shape (no PostgREST embed → multiple .from()
 * calls per request).
 * ----------------------------------------------------------*/

type MockResponse = { data: unknown; error: { message: string } | null };

let mockResponses: { [tableKey: string]: MockResponse[] } = {};
let fromCalls: string[] = [];
let lastSelectByTable: Record<string, string> = {};

function setNextResponse(tableKey: string, response: MockResponse) {
  if (!mockResponses[tableKey]) mockResponses[tableKey] = [];
  mockResponses[tableKey].push(response);
}

function shiftResponse(tableKey: string): MockResponse {
  const queue = mockResponses[tableKey];
  if (!queue || queue.length === 0) {
    return { data: [], error: null };
  }
  return queue.shift()!;
}

function buildSupabaseClient() {
  return {
    from: vi.fn((table: string) => {
      fromCalls.push(table);
      const responseKey = table;

      const builder = {
        _select: '',
        select(cols: string) {
          this._select = cols;
          lastSelectByTable[responseKey] = cols;
          return this;
        },
        eq() {
          return this;
        },
        in() {
          return this;
        },
        gte() {
          return this;
        },
        lt() {
          return this;
        },
        then(
          onFulfilled: (value: MockResponse) => unknown,
          onRejected?: (reason: unknown) => unknown,
        ) {
          try {
            return Promise.resolve(shiftResponse(responseKey)).then(
              onFulfilled,
              onRejected,
            );
          } catch (err) {
            return onRejected ? onRejected(err) : Promise.reject(err);
          }
        },
      };
      return builder as unknown as ReturnType<typeof builder.then>;
    }),
  };
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => buildSupabaseClient()),
}));

import {
  fetchCommissionReportSummary,
  fetchCommissionReportRows,
} from './actions';

beforeEach(() => {
  mockResponses = {};
  fromCalls = [];
  lastSelectByTable = {};
});

const VALID_FROM = new Date('2026-05-01T03:00:00.000Z'); // midnight SP
const VALID_TO = new Date('2026-06-01T03:00:00.000Z');

describe('fetchCommissionReportSummary', () => {
  it('rejects period when from >= to (Zod refine)', async () => {
    const res = await fetchCommissionReportSummary({
      from: VALID_TO,
      to: VALID_FROM,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/Período inválido/);
    }
  });

  it('rejects on missing fields (Zod parse)', async () => {
    const res = await fetchCommissionReportSummary({});
    expect(res.ok).toBe(false);
  });

  it('returns empty summary when no commission_entries in window', async () => {
    setNextResponse('commission_entries', { data: [], error: null });

    const res = await fetchCommissionReportSummary({
      from: VALID_FROM,
      to: VALID_TO,
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.rows).toEqual([]);
      expect(res.data.totals).toEqual({
        appointments: 0,
        revenueBrl: 0,
        commissionBrl: 0,
      });
      expect(res.data.fromIso).toBe(VALID_FROM.toISOString());
      expect(res.data.toIso).toBe(VALID_TO.toISOString());
    }
    // Should have queried commission_entries only (early exit, no professional lookup).
    expect(fromCalls).toEqual(['commission_entries']);
  });

  it('aggregates a single professional with multiple entries', async () => {
    setNextResponse('commission_entries', {
      data: [
        {
          id: 'ce-1',
          professional_id: 'p-1',
          service_price_brl: 100,
          commission_amount_brl: 50,
          created_at: '2026-05-15T13:00:00Z',
        },
        {
          id: 'ce-2',
          professional_id: 'p-1',
          service_price_brl: 150,
          commission_amount_brl: 60,
          created_at: '2026-05-16T13:00:00Z',
        },
        {
          id: 'ce-3',
          professional_id: 'p-1',
          service_price_brl: 70,
          commission_amount_brl: 35,
          created_at: '2026-05-17T13:00:00Z',
        },
      ],
      error: null,
    });
    setNextResponse('professionals', {
      data: [{ id: 'p-1', name: 'Ana' }],
      error: null,
    });

    const res = await fetchCommissionReportSummary({
      from: VALID_FROM,
      to: VALID_TO,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data.rows).toEqual([
      {
        professionalId: 'p-1',
        professionalName: 'Ana',
        appointments: 3,
        revenueBrl: 320,
        commissionBrl: 145,
      },
    ]);
    expect(res.data.totals).toEqual({
      appointments: 3,
      revenueBrl: 320,
      commissionBrl: 145,
    });
  });

  it('sorts professionals by commissionBrl DESC', async () => {
    setNextResponse('commission_entries', {
      data: [
        {
          id: 'ce-1',
          professional_id: 'p-1',
          service_price_brl: 100,
          commission_amount_brl: 30,
          created_at: '2026-05-15T13:00:00Z',
        },
        {
          id: 'ce-2',
          professional_id: 'p-2',
          service_price_brl: 200,
          commission_amount_brl: 100,
          created_at: '2026-05-15T14:00:00Z',
        },
        {
          id: 'ce-3',
          professional_id: 'p-3',
          service_price_brl: 150,
          commission_amount_brl: 75,
          created_at: '2026-05-15T15:00:00Z',
        },
      ],
      error: null,
    });
    setNextResponse('professionals', {
      data: [
        { id: 'p-1', name: 'Ana' },
        { id: 'p-2', name: 'Bruno' },
        { id: 'p-3', name: 'Carla' },
      ],
      error: null,
    });

    const res = await fetchCommissionReportSummary({
      from: VALID_FROM,
      to: VALID_TO,
    });
    if (!res.ok) throw new Error('expected ok');
    expect(res.data.rows.map((r) => r.professionalName)).toEqual([
      'Bruno',
      'Carla',
      'Ana',
    ]);
  });

  it('uses NO PostgREST embed (separate IN query for professionals)', async () => {
    setNextResponse('commission_entries', {
      data: [
        {
          id: 'ce-1',
          professional_id: 'p-1',
          service_price_brl: 100,
          commission_amount_brl: 50,
          created_at: '2026-05-15T13:00:00Z',
        },
      ],
      error: null,
    });
    setNextResponse('professionals', {
      data: [{ id: 'p-1', name: 'Ana' }],
      error: null,
    });

    await fetchCommissionReportSummary({
      from: VALID_FROM,
      to: VALID_TO,
    });

    expect(fromCalls).toEqual(['commission_entries', 'professionals']);
    // SELECT clause must NOT contain `!inner(` (PostgREST embed syntax).
    expect(lastSelectByTable['commission_entries'] ?? '').not.toMatch(/!inner|!left/);
    expect(lastSelectByTable['professionals'] ?? '').not.toMatch(/!inner|!left/);
  });

  it('returns friendly error when commission_entries query fails', async () => {
    setNextResponse('commission_entries', {
      data: null,
      error: { message: 'connection lost' },
    });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await fetchCommissionReportSummary({
      from: VALID_FROM,
      to: VALID_TO,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/Erro ao carregar comissões/);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('rounds revenue/commission to 2 decimals (avoids float drift)', async () => {
    setNextResponse('commission_entries', {
      data: [
        // 0.1 + 0.2 in JS = 0.30000000000000004 — rounding required.
        {
          id: 'ce-1',
          professional_id: 'p-1',
          service_price_brl: 0.1,
          commission_amount_brl: 0.1,
          created_at: '2026-05-15T13:00:00Z',
        },
        {
          id: 'ce-2',
          professional_id: 'p-1',
          service_price_brl: 0.2,
          commission_amount_brl: 0.2,
          created_at: '2026-05-15T13:00:00Z',
        },
      ],
      error: null,
    });
    setNextResponse('professionals', {
      data: [{ id: 'p-1', name: 'Ana' }],
      error: null,
    });

    const res = await fetchCommissionReportSummary({
      from: VALID_FROM,
      to: VALID_TO,
    });
    if (!res.ok) throw new Error('expected ok');
    expect(res.data.rows[0]?.revenueBrl).toBe(0.3);
    expect(res.data.totals.commissionBrl).toBe(0.3);
  });
});

describe('fetchCommissionReportRows', () => {
  it('rejects on invalid professionalId', async () => {
    const res = await fetchCommissionReportRows({
      from: VALID_FROM,
      to: VALID_TO,
      professionalId: 'not-a-uuid',
    });
    expect(res.ok).toBe(false);
  });

  it('returns chronologically sorted rows (scheduledAt ASC)', async () => {
    setNextResponse('commission_entries', {
      data: [
        {
          id: 'ce-1',
          appointment_id: 'a-1',
          service_price_brl: 100,
          percent_applied: 50,
          commission_amount_brl: 50,
        },
        {
          id: 'ce-2',
          appointment_id: 'a-2',
          service_price_brl: 200,
          percent_applied: 60,
          commission_amount_brl: 120,
        },
      ],
      error: null,
    });
    setNextResponse('appointments', {
      data: [
        // a-2 scheduled BEFORE a-1 — expect a-2 first in result.
        {
          id: 'a-1',
          scheduled_at: '2026-05-20T13:00:00Z',
          client_id: 'c-1',
          service_id: 's-1',
        },
        {
          id: 'a-2',
          scheduled_at: '2026-05-15T13:00:00Z',
          client_id: 'c-2',
          service_id: 's-2',
        },
      ],
      error: null,
    });
    setNextResponse('clients', {
      data: [
        { id: 'c-1', name: 'Cliente A' },
        { id: 'c-2', name: 'Cliente B' },
      ],
      error: null,
    });
    setNextResponse('services', {
      data: [
        { id: 's-1', name: 'Corte' },
        { id: 's-2', name: 'Coloração' },
      ],
      error: null,
    });

    const res = await fetchCommissionReportRows({
      from: VALID_FROM,
      to: VALID_TO,
      professionalId: '11111111-1111-4111-8111-111111111111',
    });
    if (!res.ok) throw new Error('expected ok');

    expect(res.data.map((r) => r.appointmentId)).toEqual(['a-2', 'a-1']);
    expect(res.data[0]?.clientName).toBe('Cliente B');
    expect(res.data[0]?.serviceName).toBe('Coloração');
    expect(res.data[1]?.percentApplied).toBe(50);
  });

  it('uses NO PostgREST embed (separate IN queries for relations)', async () => {
    setNextResponse('commission_entries', {
      data: [
        {
          id: 'ce-1',
          appointment_id: 'a-1',
          service_price_brl: 100,
          percent_applied: 50,
          commission_amount_brl: 50,
        },
      ],
      error: null,
    });
    setNextResponse('appointments', {
      data: [
        {
          id: 'a-1',
          scheduled_at: '2026-05-20T13:00:00Z',
          client_id: 'c-1',
          service_id: 's-1',
        },
      ],
      error: null,
    });
    setNextResponse('clients', {
      data: [{ id: 'c-1', name: 'Cliente A' }],
      error: null,
    });
    setNextResponse('services', {
      data: [{ id: 's-1', name: 'Corte' }],
      error: null,
    });

    await fetchCommissionReportRows({
      from: VALID_FROM,
      to: VALID_TO,
      professionalId: '11111111-1111-4111-8111-111111111111',
    });

    expect(fromCalls).toEqual([
      'commission_entries',
      'appointments',
      'clients',
      'services',
    ]);
    for (const sel of Object.values(lastSelectByTable)) {
      expect(sel).not.toMatch(/!inner|!left/);
    }
  });

  it('returns empty when no entries for professional in window', async () => {
    setNextResponse('commission_entries', { data: [], error: null });

    const res = await fetchCommissionReportRows({
      from: VALID_FROM,
      to: VALID_TO,
      professionalId: '11111111-1111-4111-8111-111111111111',
    });
    if (!res.ok) throw new Error('expected ok');
    expect(res.data).toEqual([]);
    expect(fromCalls).toEqual(['commission_entries']);
  });
});
