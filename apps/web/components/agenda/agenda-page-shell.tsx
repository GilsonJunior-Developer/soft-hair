'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from 'react';
import { useRouter } from 'next/navigation';
import { toZonedTime } from 'date-fns-tz';
import {
  BR_TIMEZONE,
  computeWindow,
  parseAnchor,
  type AgendaView,
} from '@/lib/agenda/date-range';
import { useAgendaRealtime } from '@/lib/agenda/use-agenda-realtime';
import type {
  AgendaAppointment,
  AgendaProfessional,
} from '@/app/(dashboard)/agenda/actions';
import { Dialog } from '@/components/ui/dialog';
import { AgendaToolbar } from './agenda-toolbar';
import { AgendaDay } from './agenda-day';
import { AgendaWeek } from './agenda-week';
import { AgendaMonth } from './agenda-month';
import { AppointmentDetailDialog } from './appointment-detail-dialog';
import { AppointmentForm } from './appointment-form';

type Service = {
  id: string;
  name: string;
  durationMinutes: number;
  priceBrl: number;
  category: string;
};

export function AgendaPageShell({
  view,
  anchor,
  professionalId,
  professionals,
  appointments,
  services,
  openNew,
}: {
  view: AgendaView;
  anchor: string;
  professionalId: string | null;
  professionals: AgendaProfessional[];
  appointments: AgendaAppointment[];
  services: Service[];
  openNew: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(openNew);
  const [formSlotISO, setFormSlotISO] = useState<string | null>(null);

  // Router refresh wrapped in startTransition — off the input-response path.
  const deferredRefresh = useCallback(() => {
    startTransition(() => router.refresh());
  }, [router]);

  const anchorDate = useMemo(() => parseAnchor(anchor), [anchor]);
  const agendaWindow = useMemo(
    () => computeWindow(view, anchorDate),
    [view, anchorDate],
  );

  const selected =
    appointments.find((a) => a.id === selectedId) ?? null;

  const isAnchorToday = isSameDayBr(anchorDate, new Date());

  useAgendaRealtime(true, deferredRefresh);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!formOpen && openNew) {
      const url = new URL(window.location.href);
      url.searchParams.delete('new');
      router.replace(url.pathname + (url.search ? url.search : ''), {
        scroll: false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formOpen]);

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1
          className="text-2xl font-semibold"
          style={{ color: 'var(--color-text-strong)' }}
        >
          Agenda
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {view === 'day'
            ? 'Visualização diária'
            : view === 'week'
              ? 'Semana completa'
              : 'Visão mensal'}
        </p>
      </header>

      <AgendaToolbar
        view={view}
        anchor={anchor}
        professionalId={professionalId}
        professionals={professionals}
        onNewClick={() => {
          setFormSlotISO(null);
          setFormOpen(true);
        }}
      />

      {view === 'day' && (
        <AgendaDay
          dateISO={anchorDate.toISOString()}
          appointments={appointments}
          isToday={isAnchorToday}
          onSelectAppointment={setSelectedId}
          onSelectSlot={(iso) => {
            setFormSlotISO(iso);
            setFormOpen(true);
          }}
        />
      )}
      {view === 'week' && (
        <AgendaWeek
          weekStart={agendaWindow.from}
          appointments={appointments}
          onSelectAppointment={setSelectedId}
        />
      )}
      {view === 'month' && (
        <AgendaMonth anchor={anchorDate} appointments={appointments} />
      )}

      <AppointmentDetailDialog
        open={selectedId !== null}
        appointment={selected}
        onClose={() => setSelectedId(null)}
        onAfterAction={deferredRefresh}
      />

      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Novo agendamento"
        maxWidthClass="max-w-xl"
      >
        <AppointmentForm
          professionals={professionals}
          services={services}
          defaultScheduledAt={formSlotISO}
          defaultProfessionalId={professionalId}
          onSuccess={() => {
            setFormOpen(false);
            deferredRefresh();
          }}
          onCancel={() => setFormOpen(false)}
        />
      </Dialog>
    </section>
  );
}

function isSameDayBr(a: Date, b: Date): boolean {
  const za = toZonedTime(a, BR_TIMEZONE);
  const zb = toZonedTime(b, BR_TIMEZONE);
  return (
    za.getFullYear() === zb.getFullYear() &&
    za.getMonth() === zb.getMonth() &&
    za.getDate() === zb.getDate()
  );
}
