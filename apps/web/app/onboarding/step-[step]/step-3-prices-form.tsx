'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  addServicesFromCatalog,
  finishOnboarding,
} from '../actions';

type Service = {
  id: string;
  name: string;
  category: string;
  durationMinutes: number;
  suggestedPriceBrl: number;
};

const CATEGORY_LABELS: Record<string, string> = {
  cabelo: 'Cabelo',
  unha: 'Unha',
  barba: 'Barbearia',
  estetica: 'Estética',
};

export function Step3PricesForm({ services }: { services: Service[] }) {
  const [prices, setPrices] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const s of services) {
      init[s.id] = s.suggestedPriceBrl.toFixed(2).replace('.', ',');
    }
    return init;
  });
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Group by category
  const grouped = services.reduce<Record<string, Service[]>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});

  function parsePrice(raw: string): number | null {
    const normalized = raw.replace(/\./g, '').replace(',', '.');
    const n = Number(normalized);
    if (!Number.isFinite(n) || n < 0) return null;
    return Number(n.toFixed(2));
  }

  function onFinish(action: 'save' | 'skip') {
    setError(null);
    startTransition(async () => {
      if (action === 'save') {
        const entries: Array<{ catalogId: string; priceBrl: number }> = [];
        for (const s of services) {
          const raw = prices[s.id] ?? '';
          const parsed = parsePrice(raw);
          if (parsed === null) {
            setError(`Preço inválido para ${s.name}. Use formato 80,00`);
            return;
          }
          entries.push({ catalogId: s.id, priceBrl: parsed });
        }
        const res = await addServicesFromCatalog(entries);
        if (!res.ok) {
          setError(res.error);
          return;
        }
      }
      await finishOnboarding();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold [color:var(--color-text-strong)]">
          Revise os preços sugeridos
        </h1>
        <p className="text-sm [color:var(--color-text-muted)]">
          Preenchemos com valores médios do setor. Ajuste conforme sua realidade
          — você pode editar depois.
        </p>
      </header>

      <div className="flex flex-col gap-6">
        {Object.entries(grouped).map(([cat, list]) => (
          <section key={cat} className="flex flex-col gap-3">
            <h2 className="text-sm font-medium uppercase tracking-wide [color:var(--color-text-muted)]">
              {CATEGORY_LABELS[cat] ?? cat}
            </h2>
            <ul className="flex flex-col gap-2">
              {list.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center gap-3 rounded-[var(--radius-md)] border p-3"
                  style={{
                    borderColor: 'var(--color-border)',
                    backgroundColor: 'var(--color-surface)',
                  }}
                >
                  <div className="flex flex-1 flex-col">
                    <span className="text-sm font-medium [color:var(--color-text-strong)]">
                      {s.name}
                    </span>
                    <span className="text-xs [color:var(--color-text-muted)]">
                      {s.durationMinutes} min
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm [color:var(--color-text-muted)]">
                      R$
                    </span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={prices[s.id] ?? ''}
                      onChange={(e) =>
                        setPrices((p) => ({ ...p, [s.id]: e.target.value }))
                      }
                      aria-label={`Preço de ${s.name}`}
                      className="h-9 w-24 text-right"
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

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
          onClick={() => onFinish('save')}
          disabled={isPending}
        >
          {isPending ? 'Salvando...' : 'Concluir e ir para o dashboard'}
        </Button>
        <button
          type="button"
          onClick={() => onFinish('skip')}
          disabled={isPending}
          className="text-center text-sm underline transition-opacity hover:opacity-70 disabled:opacity-50 [color:var(--color-text-muted)]"
        >
          Pular e configurar depois
        </button>
      </div>
    </div>
  );
}
