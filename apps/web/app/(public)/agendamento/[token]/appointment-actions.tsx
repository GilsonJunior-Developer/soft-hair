'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cancelViaToken } from './actions';

type Props = {
  token: string;
  canAct: boolean;
};

type DialogState = 'idle' | 'confirming' | 'done' | 'error';

export function AppointmentActions({ token, canAct }: Props) {
  const router = useRouter();
  const [dialog, setDialog] = useState<DialogState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleCancel = () => {
    setDialog('confirming');
  };

  const confirmCancel = () => {
    setError(null);
    startTransition(async () => {
      const res = await cancelViaToken(token);
      if (!res.ok) {
        setError(res.error);
        setDialog('error');
        return;
      }
      setDialog('done');
      router.refresh();
    });
  };

  if (dialog === 'done') {
    return (
      <section
        role="status"
        aria-live="polite"
        className="flex flex-col gap-3 rounded-[var(--radius-lg)] border p-5 text-center"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-surface)',
        }}
      >
        <p
          className="text-base font-semibold"
          style={{ color: 'var(--color-text-strong)' }}
        >
          ✓ Agendamento cancelado
        </p>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Que tal remarcar num horário melhor?
        </p>
      </section>
    );
  }

  if (dialog === 'confirming') {
    return (
      <section
        className="flex flex-col gap-3 rounded-[var(--radius-lg)] border p-5"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-surface)',
        }}
      >
        <p
          className="text-sm"
          style={{ color: 'var(--color-text-strong)' }}
        >
          Tem certeza que quer cancelar este agendamento?
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="danger"
            size="md"
            disabled={isPending}
            onClick={confirmCancel}
            className="flex-1"
          >
            {isPending ? 'Cancelando…' : 'Sim, cancelar'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="md"
            disabled={isPending}
            onClick={() => setDialog('idle')}
            className="flex-1"
          >
            Voltar
          </Button>
        </div>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Link
        href={`/agendamento/${token}/reagendar`}
        aria-disabled={!canAct}
        className="flex h-12 w-full items-center justify-center rounded-[var(--radius-md)] px-6 text-base font-semibold transition-colors"
        style={{
          backgroundColor: 'var(--color-accent-600)',
          color: 'white',
        }}
      >
        Reagendar
      </Link>
      <Button
        type="button"
        variant="secondary"
        size="lg"
        onClick={handleCancel}
        disabled={!canAct}
      >
        Cancelar agendamento
      </Button>
      {dialog === 'error' && error && (
        <p
          role="alert"
          className="text-sm"
          style={{ color: 'var(--color-error)' }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
