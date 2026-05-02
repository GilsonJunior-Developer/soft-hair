'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/auth/password-input';
import { signInWithPassword, type LoginResult } from './actions';

export function LoginForm() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<LoginResult | null>(null);

  function onSubmit(formData: FormData) {
    setResult(null);
    startTransition(async () => {
      const res = await signInWithPassword(formData);
      setResult(res);
    });
  }

  const emailError =
    (result && !result.ok && result.fieldErrors?.email) || undefined;
  const passwordError =
    (result && !result.ok && result.fieldErrors?.password) || undefined;
  const genericError =
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
          aria-invalid={emailError ? true : undefined}
          aria-describedby={emailError ? 'email-error' : undefined}
          data-testid="login-email"
        />
        {emailError && (
          <p
            id="email-error"
            role="alert"
            className="text-xs"
            style={{ color: 'var(--color-error)' }}
          >
            {emailError}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Senha</Label>
          <Link
            href="/auth/recuperar-senha"
            className="text-xs underline"
            style={{ color: 'var(--color-accent-700)' }}
          >
            Esqueci minha senha
          </Link>
        </div>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          required
          minLength={8}
          placeholder="Sua senha"
          aria-invalid={passwordError ? true : undefined}
          aria-describedby={passwordError ? 'password-error' : undefined}
          data-testid="login-password"
        />
        {passwordError && (
          <p
            id="password-error"
            role="alert"
            className="text-xs"
            style={{ color: 'var(--color-error)' }}
          >
            {passwordError}
          </p>
        )}
      </div>

      {genericError && (
        <div
          role="alert"
          data-testid="login-error"
          className="rounded-[var(--radius-md)] p-3 text-sm"
          style={{
            backgroundColor: 'var(--color-error-bg)',
            color: 'var(--color-error)',
          }}
        >
          {genericError}
        </div>
      )}

      <Button type="submit" size="lg" disabled={isPending} data-testid="login-submit">
        {isPending ? 'Entrando...' : 'Entrar'}
      </Button>

      <p
        className="text-center text-xs"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Não tem conta?{' '}
        <Link
          href="/cadastro"
          className="underline"
          style={{ color: 'var(--color-accent-700)' }}
        >
          Criar conta
        </Link>
      </p>
    </form>
  );
}
