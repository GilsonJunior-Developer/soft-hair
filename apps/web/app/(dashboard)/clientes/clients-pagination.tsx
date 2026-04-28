import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PAGE_SIZE } from './types';

export function ClientsPagination({
  total,
  page,
  searchParams,
}: {
  total: number;
  page: number;
  searchParams: Record<string, string>;
}) {
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pageCount <= 1) return null;

  function buildHref(target: number) {
    const sp = new URLSearchParams(searchParams);
    if (target <= 1) sp.delete('page');
    else sp.set('page', String(target));
    const qs = sp.toString();
    return `/clientes${qs ? `?${qs}` : ''}`;
  }

  const prevDisabled = page <= 1;
  const nextDisabled = page >= pageCount;

  return (
    <nav
      aria-label="Paginação de clientes"
      className="flex items-center justify-between gap-3 pt-2"
    >
      <span className="text-xs [color:var(--color-text-muted)]">
        Página {page} de {pageCount} · {total} cliente{total === 1 ? '' : 's'}
      </span>
      <div className="flex items-center gap-2">
        {prevDisabled ? (
          <Button type="button" size="sm" variant="secondary" disabled>
            ← Anterior
          </Button>
        ) : (
          <Link href={buildHref(page - 1)} prefetch={false}>
            <Button type="button" size="sm" variant="secondary">
              ← Anterior
            </Button>
          </Link>
        )}
        {nextDisabled ? (
          <Button type="button" size="sm" variant="secondary" disabled>
            Próxima →
          </Button>
        ) : (
          <Link href={buildHref(page + 1)} prefetch={false}>
            <Button type="button" size="sm" variant="secondary">
              Próxima →
            </Button>
          </Link>
        )}
      </div>
    </nav>
  );
}
