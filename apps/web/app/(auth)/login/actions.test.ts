import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ getAll: () => [], set: () => {} })),
  headers: vi.fn(async () => ({
    get: (key: string) => (key === 'host' ? 'localhost:3000' : null),
  })),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

const mockSignInWithPassword = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { signInWithPassword: mockSignInWithPassword },
  })),
}));

import { signInWithPassword } from './actions';

describe('signInWithPassword (email + password pivot ADR-0003)', () => {
  beforeEach(() => {
    mockSignInWithPassword.mockReset();
  });

  it('rejects malformed email before calling Supabase', async () => {
    const fd = new FormData();
    fd.set('email', 'not-an-email');
    fd.set('password', 'validpass123');

    const res = await signInWithPassword(fd);

    expect(res.ok).toBe(false);
    if (res.ok === false) {
      expect(res.fieldErrors?.email).toBeDefined();
    }
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it('rejects password shorter than 8 chars', async () => {
    const fd = new FormData();
    fd.set('email', 'alice@test.com');
    fd.set('password', 'short');

    const res = await signInWithPassword(fd);

    expect(res.ok).toBe(false);
    if (res.ok === false) {
      expect(res.fieldErrors?.password).toBeDefined();
    }
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it('normalizes email (trim + lowercase) before sending', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });
    const fd = new FormData();
    fd.set('email', '  Alice@TEST.COM  ');
    fd.set('password', 'validpass123');

    await expect(signInWithPassword(fd)).rejects.toThrow('NEXT_REDIRECT');

    expect(mockSignInWithPassword).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'alice@test.com',
        password: 'validpass123',
      }),
    );
  });

  it('returns generic error when credentials invalid (does not leak which field)', async () => {
    mockSignInWithPassword.mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    });
    const fd = new FormData();
    fd.set('email', 'alice@test.com');
    fd.set('password', 'validpass123');

    const res = await signInWithPassword(fd);

    expect(res.ok).toBe(false);
    if (res.ok === false) {
      expect(res.error).toBe('Email ou senha incorretos');
      // Should NOT leak Supabase internals nor reveal which field failed
      expect(res.error).not.toContain('credentials');
      expect(res.error).not.toContain('password');
      expect(res.error).not.toContain('Invalid');
    }
  });

  it('redirects to /hoje on success (middleware handles onboarding funnel)', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });
    const fd = new FormData();
    fd.set('email', 'alice@test.com');
    fd.set('password', 'validpass123');

    await expect(signInWithPassword(fd)).rejects.toThrow('NEXT_REDIRECT:/hoje');
  });
});
