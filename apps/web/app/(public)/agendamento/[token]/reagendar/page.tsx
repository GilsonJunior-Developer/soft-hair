import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { verifyAppointmentToken } from '@/lib/appointment-token';
import { canCancelNow, formatCancelWindowMessage } from '@/lib/cancel-window';
import { RescheduleFlow } from './reschedule-flow';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Reagendar · SoftHair',
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ token: string }>;
};

type AppointmentRow = {
  appointment_id: string;
  scheduled_at: string;
  status: string;
  salon_name: string;
  salon_slug: string;
  cancel_window_hours: number;
  professional_name: string;
  professional_slug: string;
  service_id: string;
  service_name: string;
  service_duration_minutes: number;
  price_brl: number | string;
};

export default async function ReschedulePage({ params }: PageProps) {
  const { token } = await params;
  const verified = await verifyAppointmentToken(token);
  if (!verified.ok) {
    return <ErrorScreen title="Link indisponível" body={errorCopy(verified.reason)} />;
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
    return <ErrorScreen title="Link indisponível" body="Agendamento não encontrado ou link inválido." />;
  }

  const row = data[0]!;
  const scheduledAt = new Date(row.scheduled_at);
  const isTerminal = ['COMPLETED', 'NO_SHOW', 'CANCELED'].includes(row.status);

  if (isTerminal) {
    return (
      <ErrorScreen
        title="Agendamento não pode ser reagendado"
        body="Este agendamento já foi finalizado ou cancelado. Faça um novo agendamento no perfil do profissional."
        backHref={`/${row.salon_slug}/${row.professional_slug}`}
        backLabel={`Ver perfil de ${row.professional_name}`}
      />
    );
  }

  const cancelCheck = canCancelNow(scheduledAt, row.cancel_window_hours);
  if (!cancelCheck.allowed) {
    return (
      <ErrorScreen
        title="Fora da janela de alteração"
        body={formatCancelWindowMessage(cancelCheck.windowHours)}
        backHref={`/agendamento/${token}`}
        backLabel="Voltar"
      />
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-8 pb-32">
      <header className="flex flex-col gap-1">
        <p
          className="text-xs font-medium uppercase tracking-wide"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {row.salon_name}
        </p>
        <h1
          className="text-2xl font-semibold"
          style={{ color: 'var(--color-text-strong)' }}
        >
          Reagendar com {row.professional_name}
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {row.service_name} · {row.service_duration_minutes} min · R${' '}
          {formatPriceBrl(row.price_brl)}
        </p>
      </header>

      <RescheduleFlow
        token={token}
        salonSlug={row.salon_slug}
        professionalSlug={row.professional_slug}
        serviceId={row.service_id}
        serviceName={row.service_name}
        serviceDurationMinutes={row.service_duration_minutes}
      />

      <Link
        href={`/agendamento/${token}`}
        className="self-center text-sm underline"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Voltar para o agendamento
      </Link>
    </main>
  );
}

function formatPriceBrl(value: number | string): string {
  const num = typeof value === 'string' ? Number(value) : value;
  return num.toFixed(2).replace('.', ',');
}

function errorCopy(reason: 'expired' | 'invalid' | 'missing_secret'): string {
  if (reason === 'expired') {
    return 'Este link expirou. Entre em contato com o salão para alterações.';
  }
  if (reason === 'missing_secret') {
    return 'Servidor não está configurado para tokens.';
  }
  return 'Link inválido ou malformado.';
}

function ErrorScreen({
  title,
  body,
  backHref,
  backLabel,
}: {
  title: string;
  body: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 py-10 text-center">
      <h1
        className="text-xl font-semibold"
        style={{ color: 'var(--color-text-strong)' }}
      >
        {title}
      </h1>
      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
        {body}
      </p>
      {backHref && backLabel && (
        <Link
          href={backHref}
          className="text-sm underline"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {backLabel}
        </Link>
      )}
    </main>
  );
}
