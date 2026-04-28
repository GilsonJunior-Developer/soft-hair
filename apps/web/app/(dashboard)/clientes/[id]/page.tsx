import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatInTimeZone } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';
import { createClient } from '@/lib/supabase/server';
import { BR_TIMEZONE } from '@/lib/agenda/date-range';
import { formatPhoneBR } from '@/lib/phone';
import { StatusBadge } from '@/components/agenda/status-badge';
import type { AppointmentStatus } from '@/lib/appointment-state';
import { ClientActions } from './client-actions';

export const dynamic = 'force-dynamic';

const PAST_LIMIT = 10;

type ApptRow = {
  id: string;
  scheduled_at: string;
  status: AppointmentStatus;
  price_brl_final: number;
  services: { name: string } | null;
  professionals: { name: string } | null;
};

const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: userRow } = await supabase
    .from('users')
    .select('default_salon_id')
    .eq('id', user.id)
    .maybeSingle();

  const salonId = userRow?.default_salon_id ?? null;
  if (!salonId) notFound();

  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .select(
      'id, name, phone_e164, email, notes, credit_balance_brl, created_at',
    )
    .eq('id', id)
    .eq('salon_id', salonId)
    .is('deleted_at', null)
    .maybeSingle();

  if (clientErr) {
    console.error('[clientes/[id]] fetch:', clientErr.message);
  }
  if (!client) notFound();

  const nowIso = new Date().toISOString();

  const apptSelect =
    'id, scheduled_at, status, price_brl_final, services(name), professionals(name)';

  const [pastRes, upcomingRes] = await Promise.all([
    supabase
      .from('appointments')
      .select(apptSelect)
      .eq('salon_id', salonId)
      .eq('client_id', id)
      .is('deleted_at', null)
      .lt('scheduled_at', nowIso)
      .order('scheduled_at', { ascending: false })
      .limit(PAST_LIMIT),
    supabase
      .from('appointments')
      .select(apptSelect)
      .eq('salon_id', salonId)
      .eq('client_id', id)
      .is('deleted_at', null)
      .gte('scheduled_at', nowIso)
      .in('status', ['PENDING_CONFIRMATION', 'CONFIRMED'])
      .order('scheduled_at', { ascending: true }),
  ]);

  if (pastRes.error) console.error('[clientes/[id]] past:', pastRes.error.message);
  if (upcomingRes.error)
    console.error('[clientes/[id]] upcoming:', upcomingRes.error.message);

  const past = ((pastRes.data ?? []) as unknown as ApptRow[]).map(normalizeAppt);
  const upcoming = ((upcomingRes.data ?? []) as unknown as ApptRow[]).map(
    normalizeAppt,
  );

  return (
    <section className="flex flex-col gap-6">
      <nav className="text-sm">
        <Link
          href="/clientes"
          className="hover:underline [color:var(--color-text-muted)]"
        >
          ← Clientes
        </Link>
      </nav>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <span
            aria-hidden="true"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-semibold"
            style={{
              backgroundColor: 'var(--color-accent-100)',
              color: 'var(--color-accent-700)',
            }}
          >
            {client.name
              .split(' ')
              .map((w) => w[0])
              .filter(Boolean)
              .slice(0, 2)
              .join('')
              .toUpperCase() || '·'}
          </span>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold [color:var(--color-text-strong)]">
              {client.name}
            </h1>
            <p className="text-sm [color:var(--color-text-muted)]">
              {formatPhoneBR(client.phone_e164)}
              {client.email ? ` · ${client.email}` : ''}
            </p>
            <p className="text-xs [color:var(--color-text-muted)]">
              Cliente desde{' '}
              {formatInTimeZone(
                client.created_at,
                BR_TIMEZONE,
                "dd 'de' MMM yyyy",
                { locale: ptBR },
              )}
            </p>
          </div>
        </div>
        <ClientActions id={client.id} />
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Total de visitas" value={String(countCompleted(past))} />
        <Stat
          label="Próximos agendamentos"
          value={String(upcoming.length)}
        />
        <Stat
          label="Crédito de indicação"
          value={BRL.format(0)}
          hint="Disponível no Epic 5"
        />
      </div>

      <Section
        title="Próximos agendamentos"
        empty="Nenhum agendamento futuro."
        items={upcoming}
      />

      <Section
        title={`Histórico (últimos ${PAST_LIMIT})`}
        empty="Nenhum atendimento registrado ainda."
        items={past}
      />
    </section>
  );
}

function normalizeAppt(a: ApptRow): ApptRow {
  // Supabase pode devolver services/professionals como array em alguns casos;
  // garantimos formato consistente.
  return {
    ...a,
    services: Array.isArray(a.services) ? (a.services[0] ?? null) : a.services,
    professionals: Array.isArray(a.professionals)
      ? (a.professionals[0] ?? null)
      : a.professionals,
  };
}

function countCompleted(appts: ApptRow[]): number {
  return appts.filter((a) => a.status === 'COMPLETED').length;
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div
      className="flex flex-col gap-1 rounded-[var(--radius-lg)] border p-4"
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--color-surface)',
      }}
    >
      <span className="text-xs [color:var(--color-text-muted)]">{label}</span>
      <span className="text-xl font-semibold [color:var(--color-text-strong)]">
        {value}
      </span>
      {hint && (
        <span className="text-[11px] [color:var(--color-text-muted)]">{hint}</span>
      )}
    </div>
  );
}

function Section({
  title,
  items,
  empty,
}: {
  title: string;
  items: ApptRow[];
  empty: string;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold [color:var(--color-text-strong)]">
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="text-sm [color:var(--color-text-muted)]">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((a) => (
            <li
              key={a.id}
              className="flex flex-col gap-2 rounded-[var(--radius-lg)] border p-4 sm:flex-row sm:items-center sm:justify-between"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-surface)',
              }}
            >
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-medium [color:var(--color-text-strong)]">
                    {a.services?.name ?? 'Serviço removido'}
                  </span>
                  <span className="text-xs [color:var(--color-text-muted)]">
                    com {a.professionals?.name ?? 'profissional removido'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs [color:var(--color-text-muted)]">
                  <span>
                    {formatInTimeZone(
                      a.scheduled_at,
                      BR_TIMEZONE,
                      "dd 'de' MMM yyyy 'às' HH:mm",
                      { locale: ptBR },
                    )}
                  </span>
                  <span>{BRL.format(Number(a.price_brl_final))}</span>
                </div>
              </div>
              <StatusBadge status={a.status} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
