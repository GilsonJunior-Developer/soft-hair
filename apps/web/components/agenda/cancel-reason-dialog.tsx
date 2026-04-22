'use client';

import { useState, useTransition } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { transitionAppointmentStatus } from '@/app/(dashboard)/agenda/actions';

const REASON_OPTIONS = [
  { value: 'cliente_desistiu', label: 'Cliente desistiu' },
  { value: 'remarcado', label: 'Remarcado' },
  { value: 'erro_de_cadastro', label: 'Erro de cadastro' },
  { value: 'outro', label: 'Outro' },
];

export function CancelReasonDialog({
  open,
  appointmentId,
  onClose,
  onCanceled,
}: {
  open: boolean;
  appointmentId: string | null;
  onClose: () => void;
  onCanceled: () => void;
}) {
  const [reasonCode, setReasonCode] = useState('cliente_desistiu');
  const [customText, setCustomText] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit() {
    if (!appointmentId) return;
    const label =
      REASON_OPTIONS.find((r) => r.value === reasonCode)?.label ?? reasonCode;
    const reason =
      reasonCode === 'outro' && customText.trim()
        ? `Outro: ${customText.trim()}`
        : label;

    startTransition(async () => {
      const res = await transitionAppointmentStatus({
        appointmentId,
        to: 'CANCELED',
        reason,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setError(null);
      setReasonCode('cliente_desistiu');
      setCustomText('');
      onCanceled();
      onClose();
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Cancelar agendamento"
      description="Escolha um motivo (ajuda a entender operação)."
      maxWidthClass="max-w-sm"
    >
      <div className="flex flex-col gap-3">
        <Select
          value={reasonCode}
          onChange={(e) => setReasonCode(e.target.value)}
        >
          {REASON_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        {reasonCode === 'outro' && (
          <textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="Descreva o motivo"
            rows={3}
            className="rounded-[var(--radius-md)] border px-3 py-2 text-sm [border-color:var(--color-border-strong)]"
          />
        )}
        {error && (
          <p role="alert" className="text-xs [color:var(--color-error)]">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isPending}
          >
            Voltar
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={onSubmit}
            disabled={isPending}
          >
            {isPending ? 'Cancelando...' : 'Confirmar cancelamento'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
