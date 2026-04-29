'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { updateAppointmentNotes } from '../actions';

const MAX = 2000;

export function NotesEditor({
  appointmentId,
  clientId,
  initial,
}: {
  appointmentId: string;
  clientId: string;
  initial: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(initial ?? '');
  const [savedValue, setSavedValue] = useState(initial ?? '');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const dirty = value !== savedValue;
  const overLimit = value.length > MAX;

  function onSave() {
    if (!dirty || overLimit) return;
    setError(null);
    setJustSaved(false);
    startTransition(async () => {
      const res = await updateAppointmentNotes(appointmentId, value, clientId);
      if (res.ok) {
        setSavedValue(value);
        setJustSaved(true);
        router.refresh();
        setTimeout(() => setJustSaved(false), 2500);
      } else {
        setError(res.error);
      }
    });
  }

  function onCancel() {
    setValue(savedValue);
    setError(null);
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start text-xs underline-offset-2 hover:underline [color:var(--color-text-muted)]"
        aria-expanded="false"
      >
        {savedValue ? 'Editar observações' : '+ Adicionar observações'}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={`notes-${appointmentId}`}
        className="text-xs [color:var(--color-text-muted)]"
      >
        Observações do atendimento
      </label>
      <textarea
        id={`notes-${appointmentId}`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={3}
        maxLength={MAX + 100}
        placeholder="Ex.: Cliente preferiu lateral mais curta. Alergia a tinta com amônia."
        className="w-full rounded-[var(--radius-md)] border px-3 py-2 text-sm shadow-[var(--shadow-sm)] [background-color:var(--color-surface)] [color:var(--color-text-strong)] [border-color:var(--color-border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:[--tw-ring-color:var(--color-accent-500)]"
        aria-invalid={overLimit}
        aria-describedby={`notes-${appointmentId}-meta`}
        disabled={isPending}
      />
      <div
        id={`notes-${appointmentId}-meta`}
        className="flex items-center justify-between text-[11px]"
      >
        <span
          style={{
            color: overLimit ? 'var(--color-error)' : 'var(--color-text-muted)',
          }}
        >
          {value.length}/{MAX}
        </span>
        <div className="flex items-center gap-2">
          {justSaved && (
            <span style={{ color: 'var(--color-status-completed)' }}>Salvo ✓</span>
          )}
          {error && (
            <span role="alert" style={{ color: 'var(--color-error)' }}>
              {error}
            </span>
          )}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={onCancel}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onSave}
            disabled={isPending || !dirty || overLimit}
          >
            {isPending ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
