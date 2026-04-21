'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CITY_OPTIONS } from '../constants';
import { createSalon, finishOnboarding } from '../actions';

function formatCnpj(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export function Step1Salon() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [, setIsSkipping] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generic, setGeneric] = useState<string | null>(null);
  const [cnpj, setCnpj] = useState('');

  function onSubmit(formData: FormData) {
    setErrors({});
    setGeneric(null);
    startTransition(async () => {
      const res = await createSalon(formData);
      if (res.ok) {
        router.push('/onboarding/2');
      } else {
        if (res.fieldErrors) setErrors(res.fieldErrors);
        if (!res.fieldErrors || Object.keys(res.fieldErrors).length === 0) {
          setGeneric(res.error);
        }
      }
    });
  }

  function onSkip(formData: FormData) {
    // Skip from step 1 finishes wizard with just the name (if valid)
    // We still need to create the salon — use same action
    setErrors({});
    setGeneric(null);
    setIsSkipping(async () => {
      const res = await createSalon(formData);
      if (res.ok) {
        await finishOnboarding(); // redirects to /hoje
      } else {
        if (res.fieldErrors) setErrors(res.fieldErrors);
        if (!res.fieldErrors || Object.keys(res.fieldErrors).length === 0) {
          setGeneric(res.error);
        }
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold [color:var(--color-text-strong)]">
          Vamos começar pelo seu salão
        </h1>
        <p className="text-sm [color:var(--color-text-muted)]">
          Informações básicas para criar sua conta. Você pode editar depois.
        </p>
      </header>

      <form action={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Nome do salão *</Label>
          <Input
            id="name"
            name="name"
            required
            autoFocus
            placeholder="Salão da Maria"
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? 'name-error' : undefined}
          />
          {errors.name && (
            <p id="name-error" role="alert" className="text-xs [color:var(--color-error)]">
              {errors.name}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="city">Cidade</Label>
          <select
            id="city"
            name="city"
            defaultValue=""
            className="flex h-10 w-full rounded-[var(--radius-md)] border px-3 text-sm [background-color:var(--color-surface)] [color:var(--color-text-strong)] [border-color:var(--color-border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:[--tw-ring-color:var(--color-accent-500)]"
          >
            <option value="" disabled>
              Selecione
            </option>
            {CITY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="cnpj">CNPJ (opcional)</Label>
          <Input
            id="cnpj"
            name="cnpj"
            inputMode="numeric"
            placeholder="XX.XXX.XXX/XXXX-XX"
            value={cnpj}
            onChange={(e) => setCnpj(formatCnpj(e.target.value))}
            aria-invalid={errors.cnpj ? true : undefined}
            aria-describedby={errors.cnpj ? 'cnpj-error' : undefined}
          />
          {errors.cnpj && (
            <p id="cnpj-error" role="alert" className="text-xs [color:var(--color-error)]">
              {errors.cnpj}
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

        <div className="flex flex-col gap-2">
          <Button type="submit" size="lg" disabled={isPending}>
            {isPending ? 'Criando...' : 'Próximo →'}
          </Button>
          <button
            type="button"
            onClick={() => {
              const form = document.querySelector<HTMLFormElement>('form');
              if (!form) return;
              const fd = new FormData(form);
              onSkip(fd);
            }}
            disabled={isPending}
            className="text-center text-sm underline transition-opacity hover:opacity-70 disabled:opacity-50 [color:var(--color-text-muted)]"
          >
            Pular e configurar depois
          </button>
        </div>
      </form>
    </div>
  );
}
