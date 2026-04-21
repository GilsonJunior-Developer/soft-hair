'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Formato de email inválido')
    .min(5, 'Email muito curto')
    .max(254, 'Email muito longo'),
});

export type LoginResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: { email?: string } };

/**
 * Send magic link to the given email via Supabase Auth.
 *
 * Security:
 *  - Email normalized (trim + lowercase) before processing
 *  - Generic success response (does NOT reveal whether email is registered)
 *  - On service error, logs to server but returns generic error to client
 *  - Supabase handles rate limiting (default 4/hour per email)
 */
export async function sendMagicLink(formData: FormData): Promise<LoginResult> {
  const parsed = loginSchema.safeParse({ email: formData.get('email') });

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

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      shouldCreateUser: true,
    },
  });

  if (error) {
    // Log real error server-side for Sentry/ops; generic response to client
    console.error('[sendMagicLink] Supabase error:', error.message);
    return {
      ok: false,
      error: 'Não foi possível enviar o email. Tente novamente em instantes.',
    };
  }

  // Success — redirect to check-email screen (OK to leak email here via query
  // since the user typed it; shown in the UI to help them check the right inbox)
  redirect(
    `/check-email?e=${encodeURIComponent(parsed.data.email)}`,
  );
}
