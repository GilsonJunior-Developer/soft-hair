import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ShareButton } from './share-button';

export const metadata: Metadata = {
  title: 'Agendamento confirmado · SoftHair',
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{
    salon: string;
    professional: string;
    appointmentId: string;
  }>;
  searchParams: Promise<{ t?: string; email?: string }>;
};

type BookingRow = {
  appointment_id: string;
  scheduled_at: string;
  ends_at: string;
  status: string;
  client_name: string;
  client_email: string | null;
  salon_name: string;
  salon_slug: string;
  professional_name: string;
  professional_slug: string;
  service_name: string;
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

export default async function BookingSuccessPage({
  params,
  searchParams,
}: PageProps) {
  const {
    salon: salonSlug,
    professional: professionalSlug,
    appointmentId,
  } = await params;
  const sp = await searchParams;
  const token = sp.t ?? '';

  if (!token) notFound();

  const supabase = await createClient();
  const { data, error } = await (
    supabase.rpc as unknown as (
      name: string,
      args: Record<string, unknown>,
    ) => Promise<{
      data: BookingRow[] | null;
      error: { message?: string } | null;
    }>
  )('get_public_booking', {
    p_appointment_id: appointmentId,
    p_cancel_token: token,
  });

  if (error || !data || data.length === 0) {
    notFound();
  }

  const row = data[0]!;
  if (
    row.salon_slug !== salonSlug ||
    row.professional_slug !== professionalSlug
  ) {
    notFound();
  }

  const whenText = fullDateTimeFormatter.format(new Date(row.scheduled_at));
  const emailPending = sp.email === 'pending';

  const shareText = `Agendamento confirmado: ${row.service_name} com ${row.professional_name} no ${row.salon_name} em ${whenText}.`;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-col items-center gap-2 text-center">
        <div
          aria-hidden="true"
          className="flex h-16 w-16 items-center justify-center rounded-full text-3xl"
          style={{
            backgroundColor: 'var(--color-accent-50)',
            color: 'var(--color-accent-700)',
          }}
        >
          ✓
        </div>
        <h1
          className="text-2xl font-semibold"
          style={{ color: 'var(--color-text-strong)' }}
        >
          Agendamento recebido
        </h1>
        <p
          className="text-sm"
          style={{ color: 'var(--color-text-muted)' }}
        >
          O salão vai confirmar seu horário em breve.
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
        <SummaryRow label="Serviço" value={row.service_name} />
        <SummaryRow label="Profissional" value={row.professional_name} />
        <SummaryRow label="Salão" value={row.salon_name} />
        <SummaryRow label="Quando" value={whenText} />
        <SummaryRow
          label="Valor"
          value={`R$ ${formatPriceBrl(row.price_brl)}`}
        />
        {row.client_email && (
          <SummaryRow label="Email" value={row.client_email} />
        )}
      </section>

      {emailPending ? (
        <p
          role="status"
          className="rounded-[var(--radius-md)] border p-3 text-sm"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-muted)',
          }}
        >
          ⚠️ Envio de email ainda em configuração — guarde esta página ou o
          link abaixo.
        </p>
      ) : (
        <p
          className="text-sm"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Um email de confirmação foi enviado para {row.client_email}.
        </p>
      )}

      <div className="flex flex-col gap-2">
        <ShareButton title="Agendamento SoftHair" text={shareText} />
        <Link
          href={`/${row.salon_slug}/${row.professional_slug}`}
          className="inline-flex h-10 items-center justify-center rounded-[var(--radius-md)] border px-4 text-sm font-medium transition-colors hover:[background-color:var(--color-surface-hover)]"
          style={{
            borderColor: 'var(--color-border-strong)',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-base)',
          }}
        >
          Voltar para o perfil
        </Link>
      </div>
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
