'use client';

import { useState, useTransition } from 'react';
import { formatInTimeZone } from 'date-fns-tz';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BR_TIMEZONE } from '@/lib/agenda/date-range';
import { formatPhoneBR } from '@/lib/phone';
import {
  allowedTransitions,
  STATUS_LABELS,
  type AppointmentStatus,
} from '@/lib/appointment-state';
import { transitionAppointmentStatus } from '@/app/(dashboard)/agenda/actions';
import type { AgendaAppointment } from '@/app/(dashboard)/agenda/actions';
import { StatusBadge } from './status-badge';
import { CancelReasonDialog } from './cancel-reason-dialog';

const ACTION_BUTTONS: Array<{
  to: AppointmentStatus;
  label: string;
  variant: 'primary' | 'secondary' | 'danger';
}> = [
  { to: 'CONFIRMED', label: 'Confirmar', variant: 'primary' },
  { to: 'COMPLETED', label: 'Marcar atendido', variant: 'secondary' },
  { to: 'NO_SHOW', label: 'Marcar no-show', variant: 'secondary' },
  { to: 'CANCELED', label: 'Cancelar', variant: 'danger' },
];

export function AppointmentDetailDialog({
  open,
  appointment,
  onClose,
  onAfterAction,
}: {
  open: boolean;
  appointment: AgendaAppointment | null;
  onClose: () => void;
  onAfterAction: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  if (!appointment) return null;

  const allowed = allowedTransitions(appointment.status);

  function runTransition(to: AppointmentStatus) {
    if (to === 'CANCELED') {
      setCancelOpen(true);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await transitionAppointmentStatus({
        appointmentId: appointment!.id,
        to,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onAfterAction();
      onClose();
    });
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        title="Detalhes do agendamento"
        maxWidthClass="max-w-md"
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <StatusBadge status={appointment.status} size="md" />
            <span
              className="text-xs"
              style={{ color: 'var(--color-text-muted)' }}
            >
              R$ {appointment.priceFinalBrl.toFixed(2).replace('.', ',')}
            </span>
          </div>

          <dl className="flex flex-col gap-2 text-sm">
            <Row label="Cliente" value={appointment.client?.name ?? '—'} />
            {appointment.client?.phone && (
              <Row
                label="Telefone"
                value={formatPhoneBR(appointment.client.phone)}
              />
            )}
            <Row label="Serviço" value={appointment.service.name} />
            <Row label="Profissional" value={appointment.professional.name} />
            <Row
              label="Horário"
              value={`${formatInTimeZone(new Date(appointment.scheduledAt), BR_TIMEZONE, "dd/MM · HH:mm")} → ${formatInTimeZone(new Date(appointment.endsAt), BR_TIMEZONE, 'HH:mm')}`}
            />
          </dl>

          {allowed.length > 0 ? (
            <div
              className="flex flex-wrap gap-2 border-t pt-3"
              style={{ borderColor: 'var(--color-border)' }}
            >
              {ACTION_BUTTONS.filter((b) => allowed.includes(b.to)).map((b) => (
                <Button
                  key={b.to}
                  type="button"
                  size="sm"
                  variant={b.variant}
                  disabled={isPending}
                  onClick={() => runTransition(b.to)}
                >
                  {b.label}
                </Button>
              ))}
            </div>
          ) : (
            <p
              className="rounded-[var(--radius-md)] px-3 py-2 text-xs"
              style={{
                backgroundColor: 'var(--color-surface-hover)',
                color: 'var(--color-text-muted)',
              }}
            >
              Estado final: <strong>{STATUS_LABELS[appointment.status]}</strong>. Sem ações disponíveis.
            </p>
          )}

          {error && (
            <p role="alert" className="text-xs [color:var(--color-error)]">
              {error}
            </p>
          )}
        </div>
      </Dialog>

      <CancelReasonDialog
        open={cancelOpen}
        appointmentId={appointment.id}
        onClose={() => setCancelOpen(false)}
        onCanceled={() => {
          setCancelOpen(false);
          onAfterAction();
          onClose();
        }}
      />
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[90px_1fr] gap-2">
      <dt
        className="text-xs uppercase tracking-wide"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {label}
      </dt>
      <dd style={{ color: 'var(--color-text-strong)' }}>{value}</dd>
    </div>
  );
}
