'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  toggleActiveProfessional,
  softDeleteProfessional,
} from '../actions';

export function ProfessionalActions({
  id,
  isActive,
}: {
  id: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  function onToggle() {
    startTransition(async () => {
      await toggleActiveProfessional(id, !isActive);
      router.refresh();
    });
  }

  function onDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      // Auto-reset if user doesn't confirm within 5s
      setTimeout(() => setConfirmDelete(false), 5000);
      return;
    }
    startTransition(async () => {
      const res = await softDeleteProfessional(id);
      if (res.ok) {
        router.push('/profissionais');
        router.refresh();
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={onToggle}
        disabled={isPending}
      >
        {isActive ? 'Desativar' : 'Ativar'}
      </Button>
      <Button
        type="button"
        variant="danger"
        size="sm"
        onClick={onDelete}
        disabled={isPending}
      >
        {confirmDelete ? 'Confirmar?' : 'Remover'}
      </Button>
    </div>
  );
}
