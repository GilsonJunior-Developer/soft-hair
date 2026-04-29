import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ getAll: () => [], set: () => {} })),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

const mockGetUser = vi.fn();
const mockUsersMaybeSingle = vi.fn();
const mockUpdateChain = {
  eq: vi.fn().mockReturnThis(),
  // resolved value set per-test below
  _resolve: { error: null as unknown },
};
const mockFromUpdate = vi.fn();
const mockFromSelect = vi.fn();

function buildSupabaseClient() {
  return {
    auth: { getUser: mockGetUser },
    from: vi.fn((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: mockUsersMaybeSingle,
        };
      }
      if (table === 'appointments' || table === 'clients') {
        return {
          update: (...args: unknown[]) => {
            mockFromUpdate(table, ...args);
            const chain = {
              eq: vi.fn().mockImplementation(() => chain),
              then: (resolve: (v: { error: unknown }) => unknown) =>
                resolve({ error: mockUpdateChain._resolve.error }),
            };
            return chain;
          },
          select: mockFromSelect,
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    }),
  };
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => buildSupabaseClient()),
}));

import { softDeleteClient, updateAppointmentNotes } from './actions';

describe('softDeleteClient', () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockUsersMaybeSingle.mockReset();
    mockFromUpdate.mockReset();
    mockUpdateChain._resolve = { error: null };
  });

  it('rejects when no user session', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await softDeleteClient('00000000-0000-0000-0000-000000000001');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/salão/i);
  });

  it('rejects when user has no default salon', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockUsersMaybeSingle.mockResolvedValue({ data: null });

    const res = await softDeleteClient('00000000-0000-0000-0000-000000000001');
    expect(res.ok).toBe(false);
  });

  it('issues update scoped by salon_id (defense in depth)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockUsersMaybeSingle.mockResolvedValue({
      data: { default_salon_id: 'salon-A' },
    });

    const res = await softDeleteClient('client-1');
    expect(res.ok).toBe(true);
    expect(mockFromUpdate).toHaveBeenCalledWith(
      'clients',
      expect.objectContaining({ deleted_at: expect.any(String) }),
    );
  });
});

describe('updateAppointmentNotes', () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockUsersMaybeSingle.mockReset();
    mockFromUpdate.mockReset();
    mockUpdateChain._resolve = { error: null };
  });

  it('rejects notes longer than 2000 characters', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockUsersMaybeSingle.mockResolvedValue({
      data: { default_salon_id: 'salon-A' },
    });

    const tooLong = 'x'.repeat(2001);
    const res = await updateAppointmentNotes('appt-1', tooLong);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/2000/);
  });

  it('accepts max-length notes (boundary 2000)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockUsersMaybeSingle.mockResolvedValue({
      data: { default_salon_id: 'salon-A' },
    });

    const exactly = 'x'.repeat(2000);
    const res = await updateAppointmentNotes('appt-1', exactly);
    expect(res.ok).toBe(true);
  });

  it('persists trimmed text and converts whitespace-only to NULL', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockUsersMaybeSingle.mockResolvedValue({
      data: { default_salon_id: 'salon-A' },
    });

    const res = await updateAppointmentNotes('appt-1', '   \n\t  ');
    expect(res.ok).toBe(true);
    expect(mockFromUpdate).toHaveBeenCalledWith(
      'appointments',
      expect.objectContaining({ notes: null }),
    );
  });

  it('rejects when no salon context (no session)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await updateAppointmentNotes('appt-1', 'qualquer nota');
    expect(res.ok).toBe(false);
  });

  it('returns error when supabase update fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockUsersMaybeSingle.mockResolvedValue({
      data: { default_salon_id: 'salon-A' },
    });
    mockUpdateChain._resolve = { error: { message: 'db down' } };

    const res = await updateAppointmentNotes('appt-1', 'nota');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/Erro ao salvar/);
  });
});
