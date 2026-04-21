import { describe, it, expect, vi, beforeEach } from 'vitest';

/*
 * Mock next/headers (Server-Component-only APIs) before importing actions.
 * The real `headers()` / `cookies()` throw when called outside a request scope.
 */
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    getAll: () => [],
    set: () => {},
  })),
  headers: vi.fn(async () => ({
    get: (key: string) =>
      key === 'host' ? 'localhost:3000' : null,
  })),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

// Mock Supabase client — control the response from signInWithOtp
const mockSignInWithOtp = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      signInWithOtp: mockSignInWithOtp,
    },
  })),
}));

/*
 * Import after mocks so the module picks up our stubs.
 */
import { sendMagicLink } from './actions';

describe('sendMagicLink', () => {
  beforeEach(() => {
    mockSignInWithOtp.mockReset();
  });

  it('rejects malformed email', async () => {
    const fd = new FormData();
    fd.set('email', 'not-an-email');

    const res = await sendMagicLink(fd);

    expect(res.ok).toBe(false);
    if (res.ok === false) {
      expect(res.fieldErrors?.email).toBeDefined();
    }
    expect(mockSignInWithOtp).not.toHaveBeenCalled();
  });

  it('rejects empty email', async () => {
    const fd = new FormData();
    fd.set('email', '');

    const res = await sendMagicLink(fd);

    expect(res.ok).toBe(false);
    expect(mockSignInWithOtp).not.toHaveBeenCalled();
  });

  it('normalizes email (trim + lowercase) before sending', async () => {
    mockSignInWithOtp.mockResolvedValue({ error: null });
    const fd = new FormData();
    fd.set('email', '  Alice@TEST.COM  ');

    await expect(sendMagicLink(fd)).rejects.toThrow('NEXT_REDIRECT');

    expect(mockSignInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'alice@test.com' }),
    );
  });

  it('returns generic error when Supabase fails', async () => {
    mockSignInWithOtp.mockResolvedValue({
      error: { message: 'SMTP provider down' },
    });
    const fd = new FormData();
    fd.set('email', 'alice@test.com');

    const res = await sendMagicLink(fd);

    expect(res.ok).toBe(false);
    if (res.ok === false) {
      expect(res.error).toBeDefined();
      // Generic message — should NOT leak "SMTP provider down"
      expect(res.error).not.toContain('SMTP');
    }
  });

  it('redirects to /check-email on success (email in query)', async () => {
    mockSignInWithOtp.mockResolvedValue({ error: null });
    const fd = new FormData();
    fd.set('email', 'alice@test.com');

    await expect(sendMagicLink(fd)).rejects.toThrow(
      'NEXT_REDIRECT:/check-email?e=alice%40test.com',
    );
  });
});
