'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

/* ----------------------------------------------------------
 * Schema
 * ----------------------------------------------------------*/

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Formato de email inválido')
    .min(5)
    .max(254),
  password: z
    .string()
    .min(8, 'Senha deve ter ao menos 8 caracteres')
    .max(128),
});

export type LoginResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: { email?: string; password?: string } };

/**
 * Email + password login via Supabase Auth.
 *
 * Security:
 *  - Email normalized (trim + lowercase)
 *  - Generic error "Email ou senha incorretos" — does NOT reveal which field failed
 *  - Real error logged server-side for observability
 *  - On success, redirects server-side to /hoje (middleware handles onboarded vs not)
 */
export async function signInWithPassword(
  formData: FormData,
): Promise<LoginResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    const fieldErrors: { email?: string; password?: string } = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === 'email' && !fieldErrors.email) fieldErrors.email = issue.message;
      if (key === 'password' && !fieldErrors.password)
        fieldErrors.password = issue.message;
    }
    return { ok: false, error: 'Dados inválidos', fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    console.error('[signInWithPassword] Supabase error:', error.message);
    return {
      ok: false,
      error: 'Email ou senha incorretos',
    };
  }

  // Success — middleware decides /hoje vs /onboarding based on membership
  redirect('/hoje');
}
