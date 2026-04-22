'use client';

import { useState, useTransition } from 'react';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { requestPasswordReset, type RecuperarSenhaResult } from './actions';

export function RecuperarSenhaForm() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<RecuperarSenhaResult | null>(null);

  function onSubmit(formData: FormData) {
    setResult(null);
    startTransition(async () => {
      const res = await requestPasswordReset(formData);
      setResult(res);
    });
  }

  if (result?.ok) {
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
        <p className="text-sm font-semibold">Pedido recebido</p>
        <p className="text-xs">
          Se o email estiver cadastrado, você receberá um link para criar uma
          senha nova em instantes.
        </p>
      </div>
    );
  }

  const emailError =
    (result && !result.ok && result.fieldErrors?.email) || undefined;
  const genericError =
    result && !result.ok && !emailError ? result.error : undefined;

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
        />
        {emailError && (
          <p
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
        {isPending ? 'Enviando...' : 'Enviar link'}
      </Button>
    </form>
  );
}
