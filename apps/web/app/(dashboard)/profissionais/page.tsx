import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { CopyLinkButton } from '@/components/ui/copy-link-button';
import { SPECIALTY_LABELS } from './types';

export const dynamic = 'force-dynamic';

export default async function ProfissionaisPage() {
  const supabase = await createClient();

  // Fetch salon slug so we can build each professional's public link.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let salonSlug: string | null = null;
  if (user) {
    const { data: userRow } = await supabase
      .from('users')
      .select('default_salon_id')
      .eq('id', user.id)
      .maybeSingle();

    if (userRow?.default_salon_id) {
      const { data: salonRow } = await supabase
        .from('salons')
        .select('slug')
        .eq('id', userRow.default_salon_id)
        .maybeSingle();
      salonSlug = salonRow?.slug ?? null;
    }
  }

  const { data: professionals } = await supabase
    .from('professionals')
    .select('id, name, slug, specialties, commission_default_percent, is_active')
    .is('deleted_at', null)
    .order('name', { ascending: true });

  const list = professionals ?? [];

  return (
    <section className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold [color:var(--color-text-strong)]">
            Profissionais
          </h1>
          <p className="text-sm [color:var(--color-text-muted)]">
            {list.length === 0
              ? 'Nenhum profissional cadastrado ainda.'
              : `${list.length} profissional${list.length === 1 ? '' : 'is'} cadastrado${list.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <Link href="/profissionais/novo">
          <Button type="button">+ Adicionar</Button>
        </Link>
      </header>

      {list.length === 0 ? (
        <div
          className="flex flex-col items-center gap-4 rounded-[var(--radius-lg)] border p-12 text-center"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-surface)',
          }}
        >
          <span
            aria-hidden="true"
            className="flex h-14 w-14 items-center justify-center rounded-full text-2xl"
            style={{
              backgroundColor: 'var(--color-accent-50)',
              color: 'var(--color-accent-600)',
            }}
          >
            ✂
          </span>
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-medium [color:var(--color-text-strong)]">
              Cadastre seu primeiro profissional
            </h2>
            <p className="max-w-md text-sm [color:var(--color-text-muted)]">
              Adicione a equipe do salão — nome, especialidade, horários e regra
              de comissão — para começar a receber agendamentos.
            </p>
          </div>
          <Link href="/profissionais/novo">
            <Button type="button" size="lg">
              + Adicionar profissional
            </Button>
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((p) => {
            const publicPath =
              salonSlug && p.is_active ? `/${salonSlug}/${p.slug}` : null;

            return (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-[var(--radius-lg)] border p-4"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-surface)',
                  opacity: p.is_active ? 1 : 0.5,
                }}
              >
                <Link
                  href={`/profissionais/${p.id}`}
                  className="flex flex-1 items-center gap-4 rounded-[var(--radius-md)] transition-colors hover:[background-color:var(--color-surface-hover)]"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-12 w-12 items-center justify-center rounded-full text-base font-semibold"
                    style={{
                      backgroundColor: 'var(--color-accent-100)',
                      color: 'var(--color-accent-700)',
                    }}
                  >
                    {p.name
                      .split(' ')
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()}
                  </span>

                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium [color:var(--color-text-strong)]">
                        {p.name}
                      </span>
                      {!p.is_active && (
                        <span
                          className="rounded-full px-2 py-0.5 text-xs"
                          style={{
                            backgroundColor: 'var(--color-status-canceled)',
                            color: 'white',
                          }}
                        >
                          Inativo
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {(p.specialties ?? []).map((s) => (
                        <span
                          key={s}
                          className="rounded-full px-2 py-0.5"
                          style={{
                            backgroundColor: 'var(--color-accent-50)',
                            color: 'var(--color-accent-700)',
                          }}
                        >
                          {SPECIALTY_LABELS[s] ?? s}
                        </span>
                      ))}
                      <span className="[color:var(--color-text-muted)]">
                        · Comissão {p.commission_default_percent}%
                      </span>
                    </div>
                  </div>
                </Link>

                {publicPath && (
                  <CopyLinkButton
                    path={publicPath}
                    label="Copiar link"
                    size="sm"
                    variant="secondary"
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
