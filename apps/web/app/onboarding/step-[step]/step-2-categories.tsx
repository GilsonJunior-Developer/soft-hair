'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CATEGORY_OPTIONS } from '../constants';
import { saveCategories, finishOnboarding } from '../actions';

// Rough count estimates from placeholder catalog (seed v0.1).
// When catalog expands to 200+, this will be a fetched count.
const SERVICES_PER_CATEGORY: Record<string, number> = {
  cabelo: 7,
  unha: 5,
  barba: 2,
  estetica: 6,
};

export function Step2Categories() {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const totalServices = Array.from(selected).reduce(
    (sum, cat) => sum + (SERVICES_PER_CATEGORY[cat] ?? 0),
    0,
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onSubmit(action: 'next' | 'skip') {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      for (const cat of selected) {
        fd.append('category', cat);
      }
      const res = await saveCategories(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (action === 'next' && selected.size > 0) {
        router.push('/onboarding/step-3');
      } else {
        await finishOnboarding();
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold [color:var(--color-text-strong)]">
          Que tipos de serviço você oferece?
        </h1>
        <p className="text-sm [color:var(--color-text-muted)]">
          Vamos pré-adicionar serviços padrão do setor. Você edita preços
          depois.
        </p>
      </header>

      <fieldset className="flex flex-col gap-3">
        <legend className="sr-only">Categorias de serviço</legend>
        {CATEGORY_OPTIONS.map((cat) => {
          const isSelected = selected.has(cat.id);
          return (
            <label
              key={cat.id}
              className="flex cursor-pointer items-center gap-3 rounded-[var(--radius-md)] border p-4 transition-colors"
              style={{
                borderColor: isSelected
                  ? 'var(--color-accent-600)'
                  : 'var(--color-border-strong)',
                backgroundColor: isSelected
                  ? 'var(--color-accent-50)'
                  : 'var(--color-surface)',
              }}
            >
              <input
                type="checkbox"
                name="category"
                value={cat.id}
                checked={isSelected}
                onChange={() => toggle(cat.id)}
                className="h-4 w-4 cursor-pointer"
                style={{ accentColor: 'var(--color-accent-600)' }}
              />
              <span className="flex-1 text-sm font-medium [color:var(--color-text-strong)]">
                {cat.label}
              </span>
              <span className="text-xs [color:var(--color-text-muted)]">
                ~{SERVICES_PER_CATEGORY[cat.id]} serviços
              </span>
            </label>
          );
        })}
      </fieldset>

      {selected.size > 0 && (
        <p
          className="rounded-[var(--radius-md)] p-3 text-sm"
          style={{
            backgroundColor: 'var(--color-accent-50)',
            color: 'var(--color-accent-900)',
          }}
        >
          Ao continuar, adicionaremos{' '}
          <strong>~{totalServices} serviços</strong> ao seu catálogo. Você
          customiza os preços no próximo passo.
        </p>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-[var(--radius-md)] p-3 text-sm"
          style={{
            backgroundColor: 'var(--color-error-bg)',
            color: 'var(--color-error)',
          }}
        >
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          size="lg"
          onClick={() => onSubmit('next')}
          disabled={isPending || selected.size === 0}
        >
          {isPending ? 'Salvando...' : 'Próximo →'}
        </Button>
        <button
          type="button"
          onClick={() => onSubmit('skip')}
          disabled={isPending}
          className="text-center text-sm underline transition-opacity hover:opacity-70 disabled:opacity-50 [color:var(--color-text-muted)]"
        >
          Pular e configurar depois
        </button>
      </div>
    </div>
  );
}

