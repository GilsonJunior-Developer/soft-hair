import Link from 'next/link';
import { Calendar, DollarSign, Gauge } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function greetingFor(hour: number): string {
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function firstName(email: string): string {
  const local = email.split('@')[0] ?? '';
  const first = local.split(/[._-]/)[0] ?? '';
  if (!first) return 'por aqui';
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

function formatDatePtBr(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
}

export default async function HojePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const now = new Date();
  const name = firstName(user?.email ?? '');
  const greeting = greetingFor(now.getHours());
  const dateLabel =
    formatDatePtBr(now).charAt(0).toUpperCase() +
    formatDatePtBr(now).slice(1);

  return (
    <section className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <p
          className="text-sm capitalize"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {dateLabel}
        </p>
        <h1
          className="font-[family-name:var(--font-display)] text-3xl font-semibold lg:text-4xl"
          style={{ color: 'var(--color-text-strong)' }}
        >
          {greeting}, {name} <span aria-hidden>👋</span>
        </h1>
      </header>

      <section aria-label="Resumo do dia" className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          icon={<Calendar className="h-4 w-4" aria-hidden />}
          label="Agendamentos hoje"
          value="0"
          hint="Nenhum por enquanto"
        />
        <MetricCard
          icon={<DollarSign className="h-4 w-4" aria-hidden />}
          label="Faturamento previsto"
          value="R$ 0,00"
          hint="Disponível após o primeiro agendamento"
        />
        <MetricCard
          icon={<Gauge className="h-4 w-4" aria-hidden />}
          label="Taxa de ocupação"
          value="—"
          hint="Calculada quando houver agenda"
        />
      </section>

      <section aria-label="Próximos agendamentos" className="flex flex-col gap-3">
        <h2
          className="text-sm font-semibold uppercase tracking-wide"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Próximos
        </h2>
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-dashed px-6 py-12 text-center"
          style={{
            borderColor: 'var(--color-border-strong)',
            backgroundColor: 'var(--color-surface)',
          }}
        >
          <Calendar
            className="h-8 w-8"
            aria-hidden
            style={{ color: 'var(--color-text-muted)' }}
          />
          <p
            className="text-sm font-medium"
            style={{ color: 'var(--color-text-strong)' }}
          >
            Nenhum agendamento hoje ainda
          </p>
          <p
            className="max-w-sm text-xs"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Quando a agenda estiver liberada, seus próximos atendimentos do dia
            aparecerão aqui.
          </p>
          <Link
            href="/profissionais"
            className="mt-2 text-xs font-medium underline"
            style={{ color: 'var(--color-accent-700)' }}
          >
            Configurar profissionais
          </Link>
        </div>
      </section>
    </section>
  );
}

function MetricCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <article
      className="flex flex-col gap-2 rounded-[var(--radius-lg)] border p-4 shadow-[var(--shadow-sm)]"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div
        className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <span
          className="flex h-6 w-6 items-center justify-center rounded-full"
          style={{
            backgroundColor: 'var(--color-accent-50)',
            color: 'var(--color-accent-700)',
          }}
        >
          {icon}
        </span>
        {label}
      </div>
      <p
        className="text-2xl font-semibold"
        style={{ color: 'var(--color-text-strong)' }}
      >
        {value}
      </p>
      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
        {hint}
      </p>
    </article>
  );
}
