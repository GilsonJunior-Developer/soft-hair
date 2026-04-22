'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/auth/password-input';
import { signUpWithPassword, type SignupResult } from './actions';

export function SignupForm() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<SignupResult | null>(null);

  function onSubmit(formData: FormData) {
    setResult(null);
    startTransition(async () => {
      const res = await signUpWithPassword(formData);
      setResult(res);
    });
  }

  if (result?.ok && result.emailConfirmationRequired) {
    return (
      <div
        className="flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border p-6 text-center"
        style={{
          backgroundColor: 'var(--color-accent-50)',
          borderColor: 'var(--color-accent-600)',
          color: 'var(--color-accent-900)',
        }}
      >
        <Mail className="h-8 w-8" aria-hidden />
        <p className="text-sm font-semibold">Confirme seu email</p>
        <p className="text-xs">
          Enviamos um link de confirmação para <strong>{result.email}</strong>.
          Clique no link para ativar sua conta e começar a usar o SoftHair.
        </p>
        <Link
          href="/login"
          className="text-xs underline"
          style={{ color: 'var(--color-accent-700)' }}
        >
          Já confirmei, ir para login
        </Link>
      </div>
    );
  }

  const errs = !result?.ok && result ? result.fieldErrors : undefined;
  const generic =
    result && !result.ok && !result.fieldErrors ? result.error : undefined;

  return (
    <form action={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="voce@salao.com.br"
          aria-invalid={errs?.email ? true : undefined}
          aria-describedby={errs?.email ? 'email-error' : undefined}
        />
        {errs?.email && (
          <p
            id="email-error"
            role="alert"
            className="text-xs"
            style={{ color: 'var(--color-error)' }}
          >
            {errs.email}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Senha</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="Ao menos 8 caracteres"
          aria-invalid={errs?.password ? true : undefined}
          aria-describedby={errs?.password ? 'password-error' : undefined}
        />
        {errs?.password && (
          <p
            id="password-error"
            role="alert"
            className="text-xs"
            style={{ color: 'var(--color-error)' }}
          >
            {errs.password}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="passwordConfirm">Confirmar senha</Label>
        <PasswordInput
          id="passwordConfirm"
          name="passwordConfirm"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="Digite a senha novamente"
          aria-invalid={errs?.passwordConfirm ? true : undefined}
          aria-describedby={
            errs?.passwordConfirm ? 'passwordConfirm-error' : undefined
          }
        />
        {errs?.passwordConfirm && (
          <p
            id="passwordConfirm-error"
            role="alert"
            className="text-xs"
            style={{ color: 'var(--color-error)' }}
          >
            {errs.passwordConfirm}
          </p>
        )}
      </div>

      {generic && (
        <div
          role="alert"
          className="rounded-[var(--radius-md)] p-3 text-sm"
          style={{
            backgroundColor: 'var(--color-error-bg)',
            color: 'var(--color-error)',
          }}
        >
          {generic}
        </div>
      )}

      <Button type="submit" size="lg" disabled={isPending}>
        {isPending ? 'Criando conta...' : 'Criar conta'}
      </Button>

      <p
        className="text-center text-xs"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Já tem conta?{' '}
        <Link
          href="/login"
          className="underline"
          style={{ color: 'var(--color-accent-700)' }}
        >
          Entrar
        </Link>
      </p>
    </form>
  );
}
