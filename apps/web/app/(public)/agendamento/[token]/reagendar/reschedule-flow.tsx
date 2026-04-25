'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { computeAvailability } from '../../../[salon]/[professional]/book/actions';
import { rescheduleViaToken } from '../actions';

type Props = {
  token: string;
  salonSlug: string;
  professionalSlug: string;
  serviceId: string;
  serviceName: string;
  serviceDurationMinutes: number;
};

const SAO_PAULO_TZ = 'America/Sao_Paulo';

const dayKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: SAO_PAULO_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const weekdayFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: SAO_PAULO_TZ,
  weekday: 'short',
});
const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: SAO_PAULO_TZ,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});
const fullDateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: SAO_PAULO_TZ,
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function dayKey(iso: string): string {
  return dayKeyFormatter.format(new Date(iso));
}
function weekdayShort(d: Date): string {
  return weekdayFormatter.format(d).replace('.', '');
}
function formatTime(iso: string): string {
  return timeFormatter.format(new Date(iso));
}
function formatFullDateTime(iso: string): string {
  return fullDateTimeFormatter.format(new Date(iso));
}

function buildDayList(count: number): Array<{ key: string; date: Date }> {
  const list: Array<{ key: string; date: Date }> = [];
  const base = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    list.push({ key: dayKeyFormatter.format(d), date: d });
  }
  return list;
}

export function RescheduleFlow({
  token,
  salonSlug,
  professionalSlug,
  serviceId,
  serviceName,
  serviceDurationMinutes,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFetchError(null);

    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + 14);

    computeAvailability({
      salonSlug,
      professionalSlug,
      serviceId,
      from: from.toISOString(),
      to: to.toISOString(),
    }).then((res) => {
      if (cancelled) return;
      if (!res.ok) {
        setFetchError(res.error);
        setSlots([]);
      } else {
        setSlots(res.data.slots);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [salonSlug, professionalSlug, serviceId]);

  const slotsByDay = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const iso of slots) {
      const key = dayKey(iso);
      const existing = map.get(key);
      if (existing) existing.push(iso);
      else map.set(key, [iso]);
    }
    return map;
  }, [slots]);

  const dayList = useMemo(() => buildDayList(14), []);

  useEffect(() => {
    if (selectedDayKey) return;
    const firstWithSlots = dayList.find((d) => slotsByDay.has(d.key));
    if (firstWithSlots) setSelectedDayKey(firstWithSlots.key);
  }, [dayList, slotsByDay, selectedDayKey]);

  const activeSlots = selectedDayKey
    ? (slotsByDay.get(selectedDayKey) ?? [])
    : [];

  const handleSubmit = useCallback(() => {
    if (!selectedSlot) return;
    setSubmitError(null);
    startTransition(async () => {
      const res = await rescheduleViaToken(token, { newScheduledAt: selectedSlot });
      if (!res.ok) {
        setSubmitError(res.error);
        return;
      }
      router.push(`/agendamento/${res.data.newToken}?justCreated=1`);
    });
  }, [selectedSlot, token, router]);

  return (
    <section aria-labelledby="reschedule-heading" className="flex flex-col gap-4">
      <h2
        id="reschedule-heading"
        className="text-base font-semibold"
        style={{ color: 'var(--color-text-strong)' }}
      >
        Escolha novo horário
      </h2>

      {loading ? (
        <div aria-busy="true" aria-label="Carregando horários" className="flex flex-col gap-3">
          <div
            className="h-12 rounded-[var(--radius-md)]"
            style={{ backgroundColor: 'var(--color-surface-hover)' }}
          />
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="h-12 rounded-[var(--radius-md)]"
                style={{ backgroundColor: 'var(--color-surface-hover)' }}
              />
            ))}
          </div>
        </div>
      ) : fetchError ? (
        <p
          role="alert"
          className="rounded-[var(--radius-lg)] border p-6 text-center text-sm"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-error)',
          }}
        >
          {fetchError}
        </p>
      ) : slots.length === 0 ? (
        <p
          className="rounded-[var(--radius-lg)] border p-6 text-center text-sm"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-muted)',
          }}
        >
          Sem horários disponíveis nos próximos 14 dias. Entre em contato com
          o salão diretamente.
        </p>
      ) : (
        <>
          <div
            role="tablist"
            aria-label="Dias"
            className="flex gap-2 overflow-x-auto pb-1"
            style={{ scrollbarWidth: 'thin' }}
          >
            {dayList.map((d) => {
              const isSelected = d.key === selectedDayKey;
              const hasSlots = slotsByDay.has(d.key);
              return (
                <button
                  key={d.key}
                  role="tab"
                  type="button"
                  aria-selected={isSelected}
                  disabled={!hasSlots}
                  onClick={() => {
                    setSelectedDayKey(d.key);
                    setSelectedSlot(null);
                  }}
                  className="flex min-w-[60px] flex-col items-center justify-center rounded-[var(--radius-md)] border px-3 py-2 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                  style={{
                    borderColor: isSelected
                      ? 'var(--color-accent-600)'
                      : 'var(--color-border)',
                    backgroundColor: isSelected
                      ? 'var(--color-accent-50)'
                      : 'var(--color-surface)',
                    color: isSelected
                      ? 'var(--color-accent-700)'
                      : 'var(--color-text-base)',
                    minHeight: 52,
                  }}
                >
                  <span className="font-medium uppercase">
                    {weekdayShort(d.date)}
                  </span>
                  <span className="text-base font-semibold">
                    {d.date.getDate()}
                  </span>
                </button>
              );
            })}
          </div>

          {activeSlots.length === 0 ? (
            <p
              className="rounded-[var(--radius-lg)] border p-6 text-center text-sm"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text-muted)',
              }}
            >
              Sem horários neste dia. Escolha outra data acima.
            </p>
          ) : (
            <ul
              className="grid grid-cols-4 gap-2 sm:grid-cols-5"
              aria-label="Horários disponíveis"
            >
              {activeSlots.map((iso) => {
                const isSelected = iso === selectedSlot;
                return (
                  <li key={iso}>
                    <button
                      type="button"
                      onClick={() => setSelectedSlot(iso)}
                      aria-pressed={isSelected}
                      className="flex h-11 w-full items-center justify-center rounded-[var(--radius-md)] border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2"
                      style={{
                        borderColor: isSelected
                          ? 'var(--color-accent-600)'
                          : 'var(--color-border)',
                        backgroundColor: isSelected
                          ? 'var(--color-accent-50)'
                          : 'var(--color-surface)',
                        color: isSelected
                          ? 'var(--color-accent-700)'
                          : 'var(--color-text-strong)',
                      }}
                    >
                      {formatTime(iso)}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {selectedSlot && (
        <div
          className="flex flex-col gap-2 rounded-[var(--radius-md)] border p-3 text-sm"
          style={{
            borderColor: 'var(--color-accent-600)',
            backgroundColor: 'var(--color-accent-50)',
            color: 'var(--color-accent-700)',
          }}
        >
          <span>
            Novo horário:{' '}
            <strong>{formatFullDateTime(selectedSlot)}</strong>
          </span>
          <span style={{ color: 'var(--color-text-muted)' }}>
            {serviceName} · {serviceDurationMinutes} min
          </span>
        </div>
      )}

      <div aria-live="polite" role="status" className="min-h-[1.25rem]">
        {submitError && (
          <p className="text-sm" style={{ color: 'var(--color-error)' }}>
            {submitError}
          </p>
        )}
      </div>

      <Button
        type="button"
        size="lg"
        disabled={!selectedSlot || isPending}
        onClick={handleSubmit}
      >
        {isPending ? 'Confirmando…' : 'Confirmar novo horário'}
      </Button>
    </section>
  );
}
