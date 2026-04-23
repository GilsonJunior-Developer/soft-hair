'use server';

import { headers } from 'next/headers';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const schema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Formato de email inválido')
    .min(5)
    .max(254),
});

export type RecuperarSenhaResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: { email?: string } };

/**
 * Request a password reset email. The email contains a magic link that
 * lands on /auth/nova-senha where the user sets a new password.
 *
 * Security: generic response — we don't reveal whether the email is
 * registered. Also Supabase rate-limits per email.
 */
export async function requestPasswordReset(
  formData: FormData,
): Promise<RecuperarSenhaResult> {
  const parsed = schema.safeParse({ email: formData.get('email') });
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Email inválido',
      fieldErrors: {
        email: parsed.error.issues[0]?.message ?? 'Email inválido',
      },
    };
  }

  const supabase = await createClient();
  const hdrs = await headers();
  const host = hdrs.get('host') ?? 'localhost:3000';
  const proto = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const origin = `${proto}://${host}`;

  // The recovery email's link must land on /auth/callback so the PKCE code
  // is exchanged for a session cookie BEFORE /auth/nova-senha runs — otherwise
  // auth.getUser() returns null there and updateUser fails with
  // "Link inválido ou expirado". The callback honors ?next= and redirects
  // post-exchange to the target page with an authenticated session.
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    { redirectTo: `${origin}/auth/callback?next=/auth/nova-senha` },
  );

  if (error) {
    console.error('[requestPasswordReset] Supabase error:', error.message);
    // Still return ok=true — generic response (don't leak which emails exist)
  }

  return { ok: true };
}
