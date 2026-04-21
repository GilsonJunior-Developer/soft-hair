'use client';

import { useEffect, useState } from 'react';
import { formatInTimeZone } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';
import {
  appointmentToGridStyle,
  GRID_END_HOUR,
  GRID_START_HOUR,
  nowToGridOffset,
  SLOT_MINUTES,
  TOTAL_SLOTS,
} from '@/lib/agenda/position';
import { BR_TIMEZONE } from '@/lib/agenda/date-range';
import type { AgendaAppointment } from '@/app/(dashboard)/agenda/actions';
import { StatusBadge } from './status-badge';

const ROW_HEIGHT = 28; // px per 30-min slot

function renderTimeLabels(): string[] {
  const labels: string[] = [];
  for (let h = GRID_START_HOUR; h <= GRID_END_HOUR; h++) {
    labels.push(`${String(h).padStart(2, '0')}:00`);
  }
  return labels;
}

export function AgendaDay({
  dateISO,
  appointments,
  isToday,
  onSelectAppointment,
  onSelectSlot,
}: {
  dateISO: string;
  appointments: AgendaAppointment[];
  isToday: boolean;
  onSelectAppointment: (appointmentId: string) => void;
  onSelectSlot: (scheduledAtISO: string) => void;
}) {
  const [nowOffset, setNowOffset] = useState<number | null>(
    isToday ? nowToGridOffset() : null,
  );

  useEffect(() => {
    if (!isToday) return;
    const tick = setInterval(() => setNowOffset(nowToGridOffset()), 60_000);
    return () => clearInterval(tick);
  }, [isToday]);

  const labels = renderTimeLabels();
  const dateLabel = formatInTimeZone(
    new Date(dateISO),
    BR_TIMEZONE,
    "EEEE, dd 'de' MMMM",
    { locale: ptBR },
  );

  return (
    <section className="flex flex-col gap-3">
      <h2
        className="text-sm font-semibold capitalize"
        style={{ color: 'var(--color-text-strong)' }}
      >
        {dateLabel}
      </h2>
      <div
        className="relative grid rounded-[var(--radius-lg)] border"
        style={{
          gridTemplateColumns: '64px 1fr',
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-surface)',
        }}
      >
        <div
          className="relative"
          style={{ height: `${TOTAL_SLOTS * ROW_HEIGHT}px` }}
        >
          {labels.map((label, i) => (
            <div
              key={label}
              className="absolute -translate-y-1/2 pl-2 text-[11px]"
              style={{
                top: `${i * 2 * ROW_HEIGHT}px`,
                color: 'var(--color-text-muted)',
              }}
            >
              {label}
            </div>
          ))}
        </div>

        <div
          className="relative border-l"
          style={{
            borderColor: 'var(--color-border)',
            height: `${TOTAL_SLOTS * ROW_HEIGHT}px`,
          }}
        >
          {Array.from({ length: TOTAL_SLOTS }).map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Criar agendamento às ${String(Math.floor((GRID_START_HOUR * 60 + i * SLOT_MINUTES) / 60)).padStart(2, '0')}:${String((i * SLOT_MINUTES) % 60).padStart(2, '0')}`}
              onClick={() => {
                const d = new Date(dateISO);
                const totalMin = GRID_START_HOUR * 60 + i * SLOT_MINUTES;
                d.setHours(Math.floor(totalMin / 60), totalMin % 60, 0, 0);
                onSelectSlot(d.toISOString());
              }}
              className="absolute left-0 right-0 border-b transition-colors hover:bg-[var(--color-surface-hover)]"
              style={{
                top: `${i * ROW_HEIGHT}px`,
                height: `${ROW_HEIGHT}px`,
                borderColor:
                  i % 2 === 1
                    ? 'var(--color-border)'
                    : 'var(--color-border-strong)',
              }}
            />
          ))}

          {appointments.map((a) => {
            const pos = appointmentToGridStyle(
              new Date(a.scheduledAt),
              new Date(a.endsAt),
            );
            if (!pos) return null;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => onSelectAppointment(a.id)}
                className="absolute left-2 right-2 flex flex-col gap-0.5 overflow-hidden rounded-[var(--radius-sm)] px-2 py-1 text-left text-xs shadow-[var(--shadow-sm)] transition-transform hover:scale-[1.01]"
                style={{
                  top: `${pos.top * ROW_HEIGHT}px`,
                  height: `${pos.height * ROW_HEIGHT - 2}px`,
                  backgroundColor: 'var(--color-accent-50)',
                  border: '1px solid var(--color-accent-600)',
                  color: 'var(--color-accent-900)',
                }}
              >
                <span className="flex items-center justify-between gap-2">
                  <strong className="truncate">
                    {formatInTimeZone(new Date(a.scheduledAt), BR_TIMEZONE, 'HH:mm')}
                    {' · '}
                    {a.client?.name ?? 'Cliente'}
                  </strong>
                  <StatusBadge status={a.status} size="xs" />
                </span>
                <span className="truncate" style={{ color: 'var(--color-text-muted)' }}>
                  {a.service.name} · {a.professional.name}
                </span>
              </button>
            );
          })}

          {nowOffset !== null && (
            <div
              aria-label="Agora"
              role="separator"
              className="pointer-events-none absolute left-0 right-0 z-10 flex items-center"
              style={{ top: `${nowOffset * ROW_HEIGHT}px` }}
            >
              <span
                className="block h-0.5 w-full"
                style={{ backgroundColor: 'var(--color-error)' }}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
