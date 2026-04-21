import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { AddFromCatalogButton } from './add-from-catalog-button';
import { CATEGORY_LABELS, formatPrice } from './types';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{
  q?: string;
  category?: string;
}>;

export default async function ServicosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { q, category } = await searchParams;

  const supabase = await createClient();

  let query = supabase
    .from('services')
    .select(
      'id, name, category, duration_minutes, price_brl, commission_override_percent, is_active, catalog_id',
    )
    .is('deleted_at', null)
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (q && q.trim().length > 0) {
    query = query.ilike('name', `%${q.trim()}%`);
  }
  if (category && category !== 'all') {
    query = query.eq('category', category);
  }

  const { data: services } = await query;
  const list = services ?? [];

  const categoriesInUse = Array.from(
    new Set((services ?? []).map((s) => s.category)),
  );

  // Group for display
  const grouped = list.reduce<Record<string, typeof list>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});

  return (
    <section className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold [color:var(--color-text-strong)]">
            Serviços
          </h1>
          <p className="text-sm [color:var(--color-text-muted)]">
            {list.length === 0
              ? 'Nenhum serviço cadastrado ainda.'
              : `${list.length} serviço${list.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AddFromCatalogButton />
          <Link href="/servicos/novo">
            <Button type="button">+ Personalizado</Button>
          </Link>
        </div>
      </header>

      {/* Search + filter */}
      <form
        method="get"
        action="/servicos"
        className="flex flex-col gap-2 sm:flex-row"
      >
        <input
          type="search"
          name="q"
          defaultValue={q ?? ''}
          placeholder="Buscar por nome..."
          className="flex h-10 flex-1 rounded-[var(--radius-md)] border px-3 text-sm [background-color:var(--color-surface)] [color:var(--color-text-strong)] [border-color:var(--color-border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:[--tw-ring-color:var(--color-accent-500)]"
        />
        <select
          name="category"
          defaultValue={category ?? 'all'}
          className="flex h-10 rounded-[var(--radius-md)] border px-3 text-sm [background-color:var(--color-surface)] [color:var(--color-text-strong)] [border-color:var(--color-border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:[--tw-ring-color:var(--color-accent-500)]"
        >
          <option value="all">Todas categorias</option>
          {categoriesInUse.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c] ?? c}
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary">
          Filtrar
        </Button>
        {(q || (category && category !== 'all')) && (
          <Link
            href="/servicos"
            className="flex h-10 items-center justify-center px-3 text-xs underline [color:var(--color-text-muted)] hover:[color:var(--color-text-strong)]"
          >
            Limpar
          </Link>
        )}
      </form>

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
            💇
          </span>
          <h2 className="text-lg font-medium [color:var(--color-text-strong)]">
            {q || category ? 'Nenhum serviço encontrado' : 'Cadastre seus serviços'}
          </h2>
          <p className="max-w-md text-sm [color:var(--color-text-muted)]">
            {q || category
              ? 'Ajuste os filtros ou volte a mostrar todos.'
              : 'Use o catálogo padrão ou crie serviços personalizados.'}
          </p>
          {!q && !category && (
            <div className="flex gap-2">
              <AddFromCatalogButton />
              <Link href="/servicos/novo">
                <Button type="button" variant="secondary">
                  Criar personalizado
                </Button>
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {Object.entries(grouped).map(([cat, items]) => (
            <section key={cat} className="flex flex-col gap-3">
              <h2 className="text-sm font-medium uppercase tracking-wide [color:var(--color-text-muted)]">
                {CATEGORY_LABELS[cat] ?? cat}{' '}
                <span className="[color:var(--color-text-muted)]">
                  · {items.length}
                </span>
              </h2>
              <ul className="flex flex-col gap-2">
                {items.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/servicos/${s.id}`}
                      className="flex items-center gap-4 rounded-[var(--radius-md)] border p-3 transition-colors hover:[background-color:var(--color-surface-hover)]"
                      style={{
                        borderColor: 'var(--color-border)',
                        backgroundColor: 'var(--color-surface)',
                        opacity: s.is_active ? 1 : 0.5,
                      }}
                    >
                      <div className="flex flex-1 flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium [color:var(--color-text-strong)]">
                            {s.name}
                          </span>
                          {!s.is_active && (
                            <span
                              className="rounded-full px-2 py-0.5 text-xs"
                              style={{
                                backgroundColor:
                                  'var(--color-status-canceled)',
                                color: 'white',
                              }}
                            >
                              Inativo
                            </span>
                          )}
                          {!s.catalog_id && (
                            <span
                              className="rounded-full px-2 py-0.5 text-xs"
                              style={{
                                backgroundColor: 'var(--color-accent-50)',
                                color: 'var(--color-accent-700)',
                              }}
                            >
                              Custom
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs [color:var(--color-text-muted)]">
                          <span>{s.duration_minutes} min</span>
                          {s.commission_override_percent !== null && (
                            <span>Comissão: {s.commission_override_percent}%</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold [color:var(--color-text-strong)]">
                          R$ {formatPrice(Number(s.price_brl))}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
