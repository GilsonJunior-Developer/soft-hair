'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  CATEGORY_LABELS,
  CATEGORY_OPTIONS,
  DURATION_OPTIONS,
  formatPrice,
  parsePrice,
} from './types';
import { createCustomService, updateService } from './actions';

type Mode = 'create' | 'edit';

export type ServiceFormInitial = {
  id?: string;
  name: string;
  category: string;
  durationMinutes: number;
  priceBrl: number;
  commissionOverridePercent: number | null;
  isFromCatalog: boolean;
};

export function ServiceForm({
  mode,
  initial,
}: {
  mode: Mode;
  initial?: ServiceFormInitial;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generic, setGeneric] = useState<string | null>(null);

  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState(initial?.category ?? 'cabelo');
  const [duration, setDuration] = useState(initial?.durationMinutes ?? 45);
  const [priceRaw, setPriceRaw] = useState(
    initial ? formatPrice(initial.priceBrl) : '',
  );
  const [commissionEnabled, setCommissionEnabled] = useState(
    initial?.commissionOverridePercent !== null &&
      initial?.commissionOverridePercent !== undefined,
  );
  const [commissionPct, setCommissionPct] = useState(
    initial?.commissionOverridePercent ?? 40,
  );

  // Services derived from catalog have name + category + duration read-only
  const catalogLocked = initial?.isFromCatalog === true && mode === 'edit';

  function onSubmit() {
    setFieldErrors({});
    setGeneric(null);

    const priceBrl = parsePrice(priceRaw);
    if (priceBrl === null) {
      setFieldErrors({ price_brl: 'Preço inválido (use 80,00)' });
      return;
    }

    const payload = {
      name,
      category,
      duration_minutes: duration,
      price_brl: priceBrl,
      commission_override_percent: commissionEnabled ? commissionPct : null,
    };

    startTransition(async () => {
      const res =
        mode === 'create'
          ? await createCustomService(payload)
          : await updateService(initial!.id!, payload);

      if (!res.ok) {
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        if (!res.fieldErrors || Object.keys(res.fieldErrors).length === 0) {
          setGeneric(res.error);
        }
        return;
      }
      router.push('/servicos');
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="flex flex-col gap-6"
    >
      {catalogLocked && (
        <div
          role="note"
          className="rounded-[var(--radius-md)] p-3 text-sm"
          style={{
            backgroundColor: 'var(--color-accent-50)',
            color: 'var(--color-accent-900)',
          }}
        >
          Este serviço vem do catálogo padrão. Você pode editar o preço e
          comissão, mas nome/categoria/duração são fixos. Para mudar isso,
          duplique como serviço personalizado.
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Nome *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={catalogLocked}
          placeholder="Corte feminino"
          aria-invalid={fieldErrors.name ? true : undefined}
        />
        {fieldErrors.name && (
          <p role="alert" className="text-xs [color:var(--color-error)]">
            {fieldErrors.name}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="category">Categoria *</Label>
        {catalogLocked ? (
          <Input value={CATEGORY_LABELS[category] ?? category} disabled />
        ) : (
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="flex h-10 w-full rounded-[var(--radius-md)] border px-3 text-sm [background-color:var(--color-surface)] [color:var(--color-text-strong)] [border-color:var(--color-border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:[--tw-ring-color:var(--color-accent-500)]"
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        )}
        {fieldErrors.category && (
          <p role="alert" className="text-xs [color:var(--color-error)]">
            {fieldErrors.category}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="duration">Duração * (minutos)</Label>
        {catalogLocked ? (
          <Input value={`${duration} min`} disabled />
        ) : (
          <select
            id="duration"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="flex h-10 w-full rounded-[var(--radius-md)] border px-3 text-sm [background-color:var(--color-surface)] [color:var(--color-text-strong)] [border-color:var(--color-border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:[--tw-ring-color:var(--color-accent-500)]"
          >
            {DURATION_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d} min
              </option>
            ))}
          </select>
        )}
        {fieldErrors.duration_minutes && (
          <p role="alert" className="text-xs [color:var(--color-error)]">
            {fieldErrors.duration_minutes}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="price">Preço * (R$)</Label>
        <div className="flex items-center gap-2">
          <span className="text-sm [color:var(--color-text-muted)]">R$</span>
          <Input
            id="price"
            type="text"
            inputMode="decimal"
            value={priceRaw}
            onChange={(e) => setPriceRaw(e.target.value)}
            required
            placeholder="80,00"
            className="w-32"
            aria-invalid={fieldErrors.price_brl ? true : undefined}
          />
        </div>
        {fieldErrors.price_brl && (
          <p role="alert" className="text-xs [color:var(--color-error)]">
            {fieldErrors.price_brl}
          </p>
        )}
      </div>

      <fieldset className="flex flex-col gap-3 rounded-[var(--radius-md)] border p-4" style={{ borderColor: 'var(--color-border)' }}>
        <legend className="px-2 text-sm font-medium [color:var(--color-text-strong)]">
          Comissão personalizada
        </legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={commissionEnabled}
            onChange={(e) => setCommissionEnabled(e.target.checked)}
            style={{ accentColor: 'var(--color-accent-600)' }}
          />
          Sobrescrever comissão default do profissional para este serviço
        </label>
        {commissionEnabled && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="commission">Percentual (%)</Label>
            <Input
              id="commission"
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={commissionPct}
              onChange={(e) => setCommissionPct(Number(e.target.value))}
              className="w-32"
            />
          </div>
        )}
      </fieldset>

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

      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push('/servicos')}
          disabled={isPending}
        >
          Cancelar
        </Button>
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending
            ? 'Salvando...'
            : mode === 'create'
              ? 'Criar serviço'
              : 'Salvar alterações'}
        </Button>
      </div>
    </form>
  );
}
