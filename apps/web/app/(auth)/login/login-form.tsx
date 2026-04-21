'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { sendMagicLink, type LoginResult } from './actions';

export function LoginForm() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<LoginResult | null>(null);

  function onSubmit(formData: FormData) {
    setResult(null);
    startTransition(async () => {
      const res = await sendMagicLink(formData);
      // Only reaches here on failure — success redirects server-side
      setResult(res);
    });
  }

  const emailError =
    (result && !result.ok && result.fieldErrors?.email) || undefined;
  const genericError = result && !result.ok && !result.fieldErrors?.email
    ? result.error
    : undefined;

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

      {genericError && (
        <div
          role="alert"
          className="rounded-[var(--radius-md)] p-3 text-sm"
          style={{
            backgroundColor: 'var(--color-error-bg)',
            color: 'var(--color-error)',
          }}
        >
          {genericError}
        </div>
      )}

      <Button type="submit" size="lg" disabled={isPending}>
        {isPending ? 'Enviando...' : 'Enviar link mágico'}
      </Button>

      <p
        className="text-center text-xs"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Primeira vez aqui? Basta informar seu email — criamos sua conta
        automaticamente.
      </p>
    </form>
  );
}
