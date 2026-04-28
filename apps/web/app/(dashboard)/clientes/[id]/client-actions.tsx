'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { softDeleteClient } from '../actions';

export function ClientActions({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 5000);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await softDeleteClient(id);
      if (res.ok) {
        router.push('/clientes');
        router.refresh();
      } else {
        setError(res.error);
        setConfirmDelete(false);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="danger"
        size="sm"
        onClick={onDelete}
        disabled={isPending}
        aria-label={confirmDelete ? 'Confirmar remoção do cliente' : 'Remover cliente'}
      >
        {isPending
          ? 'Removendo…'
          : confirmDelete
            ? 'Confirmar?'
            : 'Remover cliente'}
      </Button>
      {error && (
        <span
          role="alert"
          className="text-xs"
          style={{ color: 'var(--color-error)' }}
        >
          {error}
        </span>
      )}
    </div>
  );
}
