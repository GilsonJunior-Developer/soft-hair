'use client';

import { memo } from 'react';
import { useRouter } from 'next/navigation';
import {
  addDays,
  getDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { BR_TIMEZONE, formatAnchor } from '@/lib/agenda/date-range';
import type { AgendaAppointment } from '@/app/(dashboard)/agenda/actions';

function AgendaMonthImpl({
  anchor,
  appointments,
}: {
  anchor: Date;
  appointments: AgendaAppointment[];
}) {
  const router = useRouter();
  const monthStart = startOfMonth(anchor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });

  const days: Date[] = Array.from({ length: 42 }).map((_, i) =>
    addDays(gridStart, i),
  );

  const countByDay: Record<string, { total: number; pending: number }> = {};
  for (const a of appointments) {
    const z = toZonedTime(new Date(a.scheduledAt), BR_TIMEZONE);
    const key = `${z.getFullYear()}-${z.getMonth()}-${z.getDate()}`;
    countByDay[key] ??= { total: 0, pending: 0 };
    countByDay[key].total += 1;
    if (a.status === 'PENDING_CONFIRMATION') {
      countByDay[key].pending += 1;
    }
  }

  const weekHeaders = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  return (
    <section
      className="overflow-hidden rounded-[var(--radius-lg)] border"
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--color-surface)',
      }}
    >
      <div
        className="grid text-xs font-medium"
        style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}
      >
        {weekHeaders.map((h, i) => (
          <div
            key={i}
            className="border-b border-r py-2 text-center last:border-r-0"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-muted)',
            }}
          >
            {h}
          </div>
        ))}
      </div>
      <div
        className="grid"
        style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}
      >
        {days.map((d, i) => {
          const z = toZonedTime(d, BR_TIMEZONE);
          const key = `${z.getFullYear()}-${z.getMonth()}-${z.getDate()}`;
          const count = countByDay[key];
          const isCurrentMonth = isSameMonth(d, anchor);
          const isCurrentDay = isToday(d);

          return (
            <button
              key={i}
              type="button"
              onClick={() =>
                router.replace(
                  `/agenda?view=day&date=${formatAnchor(d)}`,
                  { scroll: false },
                )
              }
              className="flex min-h-[84px] flex-col items-start gap-1 border-b border-r p-2 text-left transition-colors last:border-r-0 hover:bg-[var(--color-surface-hover)]"
              style={{
                borderColor: 'var(--color-border)',
                opacity: isCurrentMonth ? 1 : 0.45,
              }}
            >
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold"
                style={{
                  backgroundColor: isCurrentDay
                    ? 'var(--color-accent-600)'
                    : 'transparent',
                  color: isCurrentDay
                    ? '#ffffff'
                    : 'var(--color-text-strong)',
                }}
              >
                {formatInTimeZone(d, BR_TIMEZONE, 'dd')}
              </span>
              {count && (
                <span
                  className="text-[11px]"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {count.total} agend.
                  {count.pending > 0 && ` · ${count.pending} pend.`}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export const AgendaMonth = memo(AgendaMonthImpl);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _ = getDay;
