import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type SalonRow = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  email: string | null;
  phone_e164: string | null;
};

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: membership } = await supabase
    .from('salon_members')
    .select('salon_id')
    .eq('user_id', user!.id)
    .limit(1)
    .maybeSingle();

  const { data: salon } = await supabase
    .from('salons')
    .select('id, name, slug, city, state, email, phone_e164')
    .eq('id', membership!.salon_id)
    .maybeSingle<SalonRow>();

  const rows: Array<[string, string]> = [
    ['Nome', salon?.name ?? '—'],
    ['Slug público', salon?.slug ?? '—'],
    [
      'Cidade',
      salon?.city && salon.state
        ? `${salon.city} · ${salon.state}`
        : (salon?.city ?? '—'),
    ],
    ['E-mail de contato', salon?.email ?? user?.email ?? '—'],
    ['Telefone', salon?.phone_e164 ?? '—'],
  ];

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1
          className="text-2xl font-semibold"
          style={{ color: 'var(--color-text-strong)' }}
        >
          Configurações
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Dados do salão. Edição completa chega em uma próxima entrega.
        </p>
      </header>

      <dl
        className="divide-y overflow-hidden rounded-[var(--radius-lg)] border"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-surface)',
        }}
      >
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="grid grid-cols-[160px_1fr] items-center gap-4 px-4 py-3"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <dt
              className="text-xs font-medium uppercase tracking-wide"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {label}
            </dt>
            <dd
              className="text-sm"
              style={{ color: 'var(--color-text-strong)' }}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <nav className="flex flex-col gap-2">
        <h2
          className="text-sm font-semibold"
          style={{ color: 'var(--color-text-strong)' }}
        >
          Configurações avançadas
        </h2>
        <ul
          className="divide-y overflow-hidden rounded-[var(--radius-lg)] border"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-surface)',
          }}
        >
          <li>
            <Link
              href="/configuracoes/comissao"
              className="flex items-center justify-between px-4 py-3 text-sm hover:underline"
              style={{ color: 'var(--color-text-strong)' }}
            >
              <span>Simulador de comissão</span>
              <span
                className="text-xs"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Story 4.1 →
              </span>
            </Link>
          </li>
        </ul>
      </nav>
    </section>
  );
}
