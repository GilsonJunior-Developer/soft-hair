'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const signupSchema = z
  .object({
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
    passwordConfirm: z.string(),
  })
  .refine((v) => v.password === v.passwordConfirm, {
    path: ['passwordConfirm'],
    message: 'As senhas não coincidem',
  });

export type SignupResult =
  | { ok: true; emailConfirmationRequired: boolean; email: string }
  | {
      ok: false;
      error: string;
      fieldErrors?: {
        email?: string;
        password?: string;
        passwordConfirm?: string;
      };
    };

/**
 * Create a new account via Supabase Auth (email + password).
 *
 * If the Supabase project has "Confirm email" enabled, the user receives
 * a confirmation email and must click it before logging in. The Server
 * Action returns emailConfirmationRequired=true and the UI shows a check-
 * email message.
 *
 * If "Confirm email" is disabled, Supabase returns a session immediately
 * and the middleware funnels the user into /onboarding.
 */
export async function signUpWithPassword(
  formData: FormData,
): Promise<SignupResult> {
  const parsed = signupSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    passwordConfirm: formData.get('passwordConfirm'),
  });

  if (!parsed.success) {
    const fieldErrors: {
      email?: string;
      password?: string;
      passwordConfirm?: string;
    } = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === 'email' && !fieldErrors.email)
        fieldErrors.email = issue.message;
      if (key === 'password' && !fieldErrors.password)
        fieldErrors.password = issue.message;
      if (key === 'passwordConfirm' && !fieldErrors.passwordConfirm)
        fieldErrors.passwordConfirm = issue.message;
    }
    return { ok: false, error: 'Dados inválidos', fieldErrors };
  }

  const supabase = await createClient();
  const hdrs = await headers();
  const host = hdrs.get('host') ?? 'localhost:3000';
  const proto = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const origin = `${proto}://${host}`;

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    console.error('[signUpWithPassword] Supabase error:', error.message);
    const msg = error.message.toLowerCase();
    if (msg.includes('already registered') || msg.includes('already exists')) {
      return {
        ok: false,
        error: 'Este email já possui cadastro. Entre com sua senha.',
        fieldErrors: { email: 'Email já cadastrado' },
      };
    }
    if (msg.includes('password')) {
      return {
        ok: false,
        error: 'Senha muito fraca',
        fieldErrors: { password: error.message },
      };
    }
    return {
      ok: false,
      error: 'Não foi possível criar a conta. Tente novamente em instantes.',
    };
  }

  // Session present → email confirm disabled, user is logged in.
  if (data.session) {
    redirect('/onboarding');
  }

  // No session → email confirm required. Caller shows check-email message.
  return {
    ok: true,
    emailConfirmationRequired: true,
    email: parsed.data.email,
  };
}
