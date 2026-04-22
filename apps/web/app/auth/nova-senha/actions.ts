'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const schema = z
  .object({
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

export type NovaSenhaResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
      fieldErrors?: { password?: string; passwordConfirm?: string };
    };

/**
 * Update the authenticated user's password. The session arrives via the
 * recovery magic link (exchanged at /auth/callback into a session cookie
 * before routing here). If no session, returns an auth error.
 */
export async function updatePassword(
  formData: FormData,
): Promise<NovaSenhaResult> {
  const parsed = schema.safeParse({
    password: formData.get('password'),
    passwordConfirm: formData.get('passwordConfirm'),
  });

  if (!parsed.success) {
    const fieldErrors: { password?: string; passwordConfirm?: string } = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === 'password' && !fieldErrors.password)
        fieldErrors.password = issue.message;
      if (key === 'passwordConfirm' && !fieldErrors.passwordConfirm)
        fieldErrors.passwordConfirm = issue.message;
    }
    return { ok: false, error: 'Dados inválidos', fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      error:
        'Link inválido ou expirado. Solicite um novo link em "Esqueci minha senha".',
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    console.error('[updatePassword] Supabase error:', error.message);
    return {
      ok: false,
      error: 'Não foi possível atualizar a senha. Tente novamente.',
    };
  }

  redirect('/hoje');
}
