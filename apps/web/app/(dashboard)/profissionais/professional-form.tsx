'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DAY_KEYS,
  DAY_LABELS,
  DEFAULT_WORKING_HOURS,
  SPECIALTY_LABELS,
  SPECIALTY_OPTIONS,
  type WorkingHours,
  toSlug,
} from './types';
import {
  createProfessional,
  updateProfessional,
} from './actions';

type Mode = 'create' | 'edit';

export type ProfessionalFormInitial = {
  id?: string;
  name: string;
  slug: string;
  bio: string | null;
  specialties: string[];
  workingHours: WorkingHours;
  commissionMode: 'PERCENT_FIXED' | 'TABLE';
  commissionDefaultPercent: number;
};

export function ProfessionalForm({
  mode,
  initial,
}: {
  mode: Mode;
  initial?: ProfessionalFormInitial;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generic, setGeneric] = useState<string | null>(null);

  const [name, setName] = useState(initial?.name ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(
    !!initial?.slug,
  );
  const [bio, setBio] = useState(initial?.bio ?? '');
  const [specialties, setSpecialties] = useState<Set<string>>(
    new Set(initial?.specialties ?? []),
  );
  const [workingHours, setWorkingHours] = useState<WorkingHours>(
    initial?.workingHours ?? DEFAULT_WORKING_HOURS,
  );
  const [commissionMode, setCommissionMode] = useState<
    'PERCENT_FIXED' | 'TABLE'
  >(initial?.commissionMode ?? 'PERCENT_FIXED');
  const [commissionPct, setCommissionPct] = useState(
    initial?.commissionDefaultPercent ?? 40,
  );

  function handleNameChange(v: string) {
    setName(v);
    if (!slugManuallyEdited) {
      setSlug(toSlug(v));
    }
  }

  function toggleSpecialty(s: string) {
    setSpecialties((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  function addWindow(day: keyof WorkingHours) {
    setWorkingHours((prev) => ({
      ...prev,
      [day]: [...prev[day], { from: '09:00', to: '12:00' }],
    }));
  }

  function removeWindow(day: keyof WorkingHours, idx: number) {
    setWorkingHours((prev) => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== idx),
    }));
  }

  function updateWindow(
    day: keyof WorkingHours,
    idx: number,
    field: 'from' | 'to',
    value: string,
  ) {
    setWorkingHours((prev) => ({
      ...prev,
      [day]: prev[day].map((w, i) =>
        i === idx ? { ...w, [field]: value } : w,
      ),
    }));
  }

  function onSubmit() {
    setFieldErrors({});
    setGeneric(null);
    const payload = {
      name,
      slug,
      bio,
      specialties: Array.from(specialties),
      working_hours: workingHours,
      commission_mode: commissionMode,
      commission_default_percent: commissionPct,
    };

    startTransition(async () => {
      const res =
        mode === 'create'
          ? await createProfessional(payload)
          : await updateProfessional(initial!.id!, payload);

      if (!res.ok) {
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        if (!res.fieldErrors || Object.keys(res.fieldErrors).length === 0) {
          setGeneric(res.error);
        }
        return;
      }
      router.push('/profissionais');
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
      {/* Name + slug */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Nome *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          required
          placeholder="Ana Santos"
          aria-invalid={fieldErrors.name ? true : undefined}
        />
        {fieldErrors.name && (
          <p role="alert" className="text-xs [color:var(--color-error)]">
            {fieldErrors.name}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="slug">Identificador público *</Label>
        <Input
          id="slug"
          value={slug}
          onChange={(e) => {
            setSlugManuallyEdited(true);
            setSlug(toSlug(e.target.value));
          }}
          required
          placeholder="ana-santos"
          aria-invalid={fieldErrors.slug ? true : undefined}
        />
        <p className="text-xs [color:var(--color-text-muted)]">
          Aparece na URL pública do profissional (softhair.com.br/seu-salao/
          <strong>{slug || 'slug'}</strong>).
        </p>
        {fieldErrors.slug && (
          <p role="alert" className="text-xs [color:var(--color-error)]">
            {fieldErrors.slug}
          </p>
        )}
      </div>

      {/* Bio */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="bio">Bio curta (opcional)</Label>
        <textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="12 anos de experiência em cortes modernos."
          className="flex w-full rounded-[var(--radius-md)] border p-3 text-sm [background-color:var(--color-surface)] [color:var(--color-text-strong)] [border-color:var(--color-border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:[--tw-ring-color:var(--color-accent-500)]"
        />
      </div>

      {/* Specialties */}
      <div className="flex flex-col gap-2">
        <Label>Especialidades</Label>
        <div className="flex flex-wrap gap-2">
          {SPECIALTY_OPTIONS.map((s) => {
            const selected = specialties.has(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleSpecialty(s)}
                className="rounded-full border px-3 py-1.5 text-sm transition-colors"
                style={{
                  borderColor: selected
                    ? 'var(--color-accent-600)'
                    : 'var(--color-border-strong)',
                  backgroundColor: selected
                    ? 'var(--color-accent-50)'
                    : 'var(--color-surface)',
                  color: selected
                    ? 'var(--color-accent-700)'
                    : 'var(--color-text-muted)',
                }}
                aria-pressed={selected}
              >
                {SPECIALTY_LABELS[s]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Working hours */}
      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium [color:var(--color-text-strong)]">
          Horários de trabalho
        </legend>
        <div className="flex flex-col gap-2">
          {DAY_KEYS.map((day) => (
            <div
              key={day}
              className="flex flex-col gap-2 rounded-[var(--radius-md)] border p-3"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-surface)',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium [color:var(--color-text-strong)]">
                  {DAY_LABELS[day]}
                </span>
                <button
                  type="button"
                  onClick={() => addWindow(day)}
                  className="text-xs underline [color:var(--color-accent-600)] hover:opacity-70"
                >
                  + Adicionar janela
                </button>
              </div>
              {workingHours[day].length === 0 ? (
                <p className="text-xs [color:var(--color-text-muted)]">
                  Dia de folga
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {workingHours[day].map((w, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={w.from}
                        onChange={(e) =>
                          updateWindow(day, idx, 'from', e.target.value)
                        }
                        className="h-9 w-32"
                        aria-label={`Início janela ${idx + 1} ${DAY_LABELS[day]}`}
                      />
                      <span className="text-sm [color:var(--color-text-muted)]">
                        às
                      </span>
                      <Input
                        type="time"
                        value={w.to}
                        onChange={(e) =>
                          updateWindow(day, idx, 'to', e.target.value)
                        }
                        className="h-9 w-32"
                        aria-label={`Fim janela ${idx + 1} ${DAY_LABELS[day]}`}
                      />
                      <button
                        type="button"
                        onClick={() => removeWindow(day, idx)}
                        className="text-xs underline [color:var(--color-error)] hover:opacity-70"
                        aria-label={`Remover janela ${idx + 1} ${DAY_LABELS[day]}`}
                      >
                        Remover
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </fieldset>

      {/* Commission */}
      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium [color:var(--color-text-strong)]">
          Comissão
        </legend>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="commission_mode"
              checked={commissionMode === 'PERCENT_FIXED'}
              onChange={() => setCommissionMode('PERCENT_FIXED')}
              style={{ accentColor: 'var(--color-accent-600)' }}
            />
            Percentual fixo sobre o serviço
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="commission_mode"
              checked={commissionMode === 'TABLE'}
              onChange={() => setCommissionMode('TABLE')}
              style={{ accentColor: 'var(--color-accent-600)' }}
            />
            Tabela por serviço{' '}
            <span className="text-xs [color:var(--color-text-muted)]">
              (configuração detalhada na tela de Serviços)
            </span>
          </label>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="commission_pct">
            {commissionMode === 'PERCENT_FIXED'
              ? 'Percentual fixo (%)'
              : 'Percentual default (override por serviço)'}
          </Label>
          <Input
            id="commission_pct"
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={commissionPct}
            onChange={(e) => setCommissionPct(Number(e.target.value))}
            className="w-32"
            aria-invalid={fieldErrors.commission_default_percent ? true : undefined}
          />
          {fieldErrors.commission_default_percent && (
            <p role="alert" className="text-xs [color:var(--color-error)]">
              {fieldErrors.commission_default_percent}
            </p>
          )}
        </div>
      </fieldset>

      {/* Generic error */}
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

      {/* Submit */}
      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push('/profissionais')}
          disabled={isPending}
        >
          Cancelar
        </Button>
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending
            ? 'Salvando...'
            : mode === 'create'
              ? 'Criar profissional'
              : 'Salvar alterações'}
        </Button>
      </div>
    </form>
  );
}
