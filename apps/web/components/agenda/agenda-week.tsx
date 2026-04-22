'use client';

import { memo } from 'react';
import { addDays } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';
import { BR_TIMEZONE } from '@/lib/agenda/date-range';
import { appointmentToGridStyle, TOTAL_SLOTS } from '@/lib/agenda/position';
import type { AgendaAppointment } from '@/app/(dashboard)/agenda/actions';
import { StatusBadge } from './status-badge';

const ROW_HEIGHT = 22;

function AgendaWeekImpl({
  weekStart,
  appointments,
  onSelectAppointment,
}: {
  weekStart: Date;
  appointments: AgendaAppointment[];
  onSelectAppointment: (appointmentId: string) => void;
}) {
  const days = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  const byDay = (day: Date) => {
    const zoned = toZonedTime(day, BR_TIMEZONE);
    const key = `${zoned.getFullYear()}-${zoned.getMonth()}-${zoned.getDate()}`;
    return appointments.filter((a) => {
      const zz = toZonedTime(new Date(a.scheduledAt), BR_TIMEZONE);
      return `${zz.getFullYear()}-${zz.getMonth()}-${zz.getDate()}` === key;
    });
  };

  return (
    <section className="flex flex-col gap-3">
      <div
        className="grid gap-0 overflow-hidden rounded-[var(--radius-lg)] border"
        style={{
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-surface)',
        }}
      >
        {days.map((d, i) => {
          const appts = byDay(d);
          return (
            <div
              key={i}
              className="flex flex-col border-r last:border-r-0"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div
                className="flex flex-col items-center gap-0.5 border-b py-2 text-center text-xs"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <span
                  className="capitalize"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {formatInTimeZone(d, BR_TIMEZONE, 'EEE', { locale: ptBR })}
                </span>
                <span
                  className="text-sm font-semibold"
                  style={{ color: 'var(--color-text-strong)' }}
                >
                  {formatInTimeZone(d, BR_TIMEZONE, 'dd/MM')}
                </span>
              </div>
              <div
                className="relative"
                style={{ height: `${TOTAL_SLOTS * ROW_HEIGHT}px` }}
              >
                {appts.map((a) => {
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
                      className="absolute left-1 right-1 flex flex-col overflow-hidden rounded-[var(--radius-sm)] px-1 py-0.5 text-left text-[10px] leading-tight transition-transform hover:scale-[1.01]"
                      style={{
                        top: `${pos.top * ROW_HEIGHT}px`,
                        height: `${pos.height * ROW_HEIGHT - 1}px`,
                        backgroundColor: 'var(--color-accent-50)',
                        border: '1px solid var(--color-accent-600)',
                        color: 'var(--color-accent-900)',
                      }}
                    >
                      <span className="flex items-center justify-between gap-1">
                        <strong className="truncate">
                          {formatInTimeZone(
                            new Date(a.scheduledAt),
                            BR_TIMEZONE,
                            'HH:mm',
                          )}
                        </strong>
                        <StatusBadge status={a.status} size="xs" />
                      </span>
                      <span className="truncate">{a.client?.name ?? '—'}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export const AgendaWeek = memo(AgendaWeekImpl);
