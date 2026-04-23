'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/auth/password-input';
import { updatePassword, type NovaSenhaResult } from './actions';

export function NovaSenhaForm() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<NovaSenhaResult | null>(null);

  function onSubmit(formData: FormData) {
    setResult(null);
    startTransition(async () => {
      const res = await updatePassword(formData);
      setResult(res);
    });
  }

  const errs = !result?.ok && result ? result.fieldErrors : undefined;
  const generic =
    result && !result.ok && !result.fieldErrors ? result.error : undefined;

  return (
    <form action={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Nova senha</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="Ao menos 8 caracteres"
          aria-invalid={errs?.password ? true : undefined}
        />
        {errs?.password && (
          <p
            role="alert"
            className="text-xs"
            style={{ color: 'var(--color-error)' }}
          >
            {errs.password}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="passwordConfirm">Confirmar nova senha</Label>
        <PasswordInput
          id="passwordConfirm"
          name="passwordConfirm"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="Digite a senha novamente"
          aria-invalid={errs?.passwordConfirm ? true : undefined}
        />
        {errs?.passwordConfirm && (
          <p
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
        {isPending ? 'Salvando...' : 'Salvar nova senha'}
      </Button>
    </form>
  );
}
