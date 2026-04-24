import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { verifyAppointmentToken } from '@/lib/appointment-token';
import { canCancelNow, formatCancelWindowMessage } from '@/lib/cancel-window';
import { AppointmentActions } from './appointment-actions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Meu agendamento · SoftHair',
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ justCreated?: string; email?: string }>;
};

type AppointmentRow = {
  appointment_id: string;
  scheduled_at: string;
  ends_at: string;
  duration_minutes: number;
  status: string;
  client_name: string;
  client_email: string | null;
  salon_name: string;
  salon_slug: string;
  salon_city: string | null;
  cancel_window_hours: number;
  professional_name: string;
  professional_slug: string;
  service_id: string;
  service_name: string;
  service_duration_minutes: number;
  price_brl: number | string;
};

const fullDateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function formatPriceBrl(value: number | string): string {
  const num = typeof value === 'string' ? Number(value) : value;
  return num.toFixed(2).replace('.', ',');
}

function statusLabel(s: string): string {
  switch (s) {
    case 'PENDING_CONFIRMATION':
      return 'Aguardando confirmação';
    case 'CONFIRMED':
      return 'Confirmado';
    case 'COMPLETED':
      return 'Atendido';
    case 'NO_SHOW':
      return 'Não compareceu';
    case 'CANCELED':
      return 'Cancelado';
    default:
      return s;
  }
}

export default async function AppointmentManagePage({
  params,
  searchParams,
}: PageProps) {
  const { token } = await params;
  const sp = await searchParams;
  const justCreated = sp.justCreated === '1';
  const emailPending = sp.email === 'pending';

  const verified = await verifyAppointmentToken(token);
  if (!verified.ok) {
    return <TokenErrorScreen reason={verified.reason} />;
  }

  const supabase = await createClient();
  const { data, error } = await (
    supabase.rpc as unknown as (
      name: string,
      args: Record<string, unknown>,
    ) => Promise<{
      data: AppointmentRow[] | null;
      error: { message?: string } | null;
    }>
  )('get_public_appointment', {
    p_appointment_id: verified.appointmentId,
    p_cancel_token: verified.cancelToken,
  });

  if (error || !data || data.length === 0) {
    return <TokenErrorScreen reason="invalid" />;
  }

  const row = data[0]!;
  const scheduledAt = new Date(row.scheduled_at);
  const isTerminal = ['COMPLETED', 'NO_SHOW', 'CANCELED'].includes(row.status);
  const cancelCheck = canCancelNow(scheduledAt, row.cancel_window_hours);
  const canAct = !isTerminal && cancelCheck.allowed;

  const whenText = fullDateTimeFormatter.format(scheduledAt);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-col items-center gap-2 text-center">
        {justCreated && (
          <div
            role="status"
            aria-live="polite"
            className="w-full rounded-[var(--radius-md)] border p-3 text-sm"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-accent-50)',
              color: 'var(--color-accent-700)',
            }}
          >
            ✓ Agendamento recebido — guarde este link para gerenciar depois.
          </div>
        )}
        {emailPending && (
          <div
            role="status"
            className="w-full rounded-[var(--radius-md)] border p-3 text-sm"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-muted)',
            }}
          >
            ⚠️ Envio de email ainda em configuração — guarde esta página ou o
            link acima.
          </div>
        )}
        <h1
          className="text-2xl font-semibold"
          style={{ color: 'var(--color-text-strong)' }}
        >
          Meu agendamento
        </h1>
        <p
          className="text-sm"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {row.salon_name}
          {row.salon_city ? ` · ${row.salon_city}` : ''}
        </p>
      </header>

      <section
        aria-labelledby="summary-heading"
        className="flex flex-col gap-3 rounded-[var(--radius-lg)] border p-5"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-surface)',
        }}
      >
        <h2 id="summary-heading" className="sr-only">
          Resumo
        </h2>
        <SummaryRow label="Status" value={statusLabel(row.status)} />
        <SummaryRow label="Serviço" value={row.service_name} />
        <SummaryRow label="Profissional" value={row.professional_name} />
        <SummaryRow label="Quando" value={whenText} />
        <SummaryRow label="Duração" value={`${row.duration_minutes} min`} />
        <SummaryRow
          label="Valor"
          value={`R$ ${formatPriceBrl(row.price_brl)}`}
        />
        <SummaryRow label="Cliente" value={row.client_name} />
        {row.client_email && (
          <SummaryRow label="Email" value={row.client_email} />
        )}
      </section>

      {isTerminal ? (
        <TerminalNotice status={row.status} />
      ) : !cancelCheck.allowed ? (
        <p
          className="rounded-[var(--radius-md)] border p-3 text-sm"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-muted)',
          }}
        >
          {formatCancelWindowMessage(cancelCheck.windowHours)}
        </p>
      ) : (
        <AppointmentActions token={token} canAct={canAct} />
      )}

      <Link
        href={`/${row.salon_slug}/${row.professional_slug}`}
        className="self-center text-sm underline"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Voltar para o perfil de {row.professional_name}
      </Link>
    </main>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <span
        className="text-right font-medium"
        style={{ color: 'var(--color-text-strong)' }}
      >
        {value}
      </span>
    </div>
  );
}

function TerminalNotice({ status }: { status: string }) {
  const msg =
    status === 'CANCELED'
      ? 'Este agendamento já foi cancelado.'
      : status === 'COMPLETED'
        ? 'Este agendamento já foi atendido.'
        : 'Este agendamento não está mais ativo.';
  return (
    <p
      role="status"
      className="rounded-[var(--radius-md)] border p-3 text-sm"
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        color: 'var(--color-text-muted)',
      }}
    >
      {msg}
    </p>
  );
}

function TokenErrorScreen({
  reason,
}: {
  reason: 'expired' | 'invalid' | 'missing_secret';
}) {
  const msg =
    reason === 'expired'
      ? 'Este link expirou. Entre em contato com o salão para alterações.'
      : reason === 'missing_secret'
        ? 'Servidor não está configurado para tokens. Fale com o salão.'
        : 'Link inválido ou malformado.';
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 py-10 text-center">
      <div
        aria-hidden="true"
        className="flex h-14 w-14 items-center justify-center rounded-full text-2xl"
        style={{
          backgroundColor: 'var(--color-surface-hover)',
          color: 'var(--color-text-muted)',
        }}
      >
        🔗
      </div>
      <h1
        className="text-xl font-semibold"
        style={{ color: 'var(--color-text-strong)' }}
      >
        Link indisponível
      </h1>
      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
        {msg}
      </p>
    </main>
  );
}
