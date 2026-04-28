import Link from 'next/link';
import { formatInTimeZone } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';
import { createClient } from '@/lib/supabase/server';
import { BR_TIMEZONE } from '@/lib/agenda/date-range';
import { formatPhoneBR } from '@/lib/phone';
import { ClientsSearch } from './clients-search';
import { ClientsSortSelect } from './clients-sort-select';
import { ClientsPagination } from './clients-pagination';
import { buildClientsSearchFilter } from './search-query';
import {
  PAGE_SIZE,
  type ClientRow,
  type ClientWithStats,
  type SortKey,
} from './types';

export const dynamic = 'force-dynamic';

const VALID_SORTS: SortKey[] = ['last_visit', 'name', 'visits', 'recent'];

function parseSort(raw: string | undefined): SortKey {
  if (raw && (VALID_SORTS as string[]).includes(raw)) return raw as SortKey;
  return 'last_visit';
}

function parsePage(raw: string | undefined): number {
  const n = Number(raw ?? 1);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

function compare(a: ClientWithStats, b: ClientWithStats, sort: SortKey): number {
  switch (sort) {
    case 'name':
      return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
    case 'visits':
      return b.visit_count - a.visit_count;
    case 'recent':
      return b.created_at.localeCompare(a.created_at);
    case 'last_visit':
    default: {
      const av = a.last_appointment_at ?? '';
      const bv = b.last_appointment_at ?? '';
      if (!av && !bv) {
        return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
      }
      if (!av) return 1;
      if (!bv) return -1;
      return bv.localeCompare(av);
    }
  }
}

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === 'string' ? sp.q : '';
  const sort = parseSort(typeof sp.sort === 'string' ? sp.sort : undefined);
  const page = parsePage(typeof sp.page === 'string' ? sp.page : undefined);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <section className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Clientes</h1>
        <p className="text-sm [color:var(--color-text-muted)]">
          Sessão expirada. Faça login novamente.
        </p>
      </section>
    );
  }

  const { data: userRow } = await supabase
    .from('users')
    .select('default_salon_id')
    .eq('id', user.id)
    .maybeSingle();

  const salonId = userRow?.default_salon_id ?? null;

  let clientList: ClientRow[] = [];
  const stats = new Map<
    string,
    { visit_count: number; last_appointment_at: string | null }
  >();

  if (salonId) {
    let clientsQuery = supabase
      .from('clients')
      .select('id, name, phone_e164, email, notes, credit_balance_brl, created_at')
      .eq('salon_id', salonId)
      .is('deleted_at', null);

    const filter = buildClientsSearchFilter(q);
    if (filter) clientsQuery = clientsQuery.or(filter);

    const { data: clientsRaw, error: clientsErr } = await clientsQuery;
    if (clientsErr) {
      console.error('[clientes] fetch:', clientsErr.message);
    }
    clientList = (clientsRaw ?? []) as ClientRow[];

    if (clientList.length > 0) {
      const ids = clientList.map((c) => c.id);
      const { data: appts, error: apptsErr } = await supabase
        .from('appointments')
        .select('client_id, scheduled_at, status')
        .eq('salon_id', salonId)
        .is('deleted_at', null)
        .in('client_id', ids);
      if (apptsErr) {
        console.error('[clientes] stats:', apptsErr.message);
      }
      for (const a of (appts ?? []) as Array<{
        client_id: string;
        scheduled_at: string;
        status: string;
      }>) {
        const cur =
          stats.get(a.client_id) ??
          ({ visit_count: 0, last_appointment_at: null } as {
            visit_count: number;
            last_appointment_at: string | null;
          });
        if (a.status === 'COMPLETED') {
          cur.visit_count += 1;
          if (!cur.last_appointment_at || a.scheduled_at > cur.last_appointment_at) {
            cur.last_appointment_at = a.scheduled_at;
          }
        }
        stats.set(a.client_id, cur);
      }
    }
  }

  const enriched: ClientWithStats[] = clientList.map((c) => ({
    ...c,
    visit_count: stats.get(c.id)?.visit_count ?? 0,
    last_appointment_at: stats.get(c.id)?.last_appointment_at ?? null,
  }));

  enriched.sort((a, b) => compare(a, b, sort));

  const total = enriched.length;
  const start = (page - 1) * PAGE_SIZE;
  const slice = enriched.slice(start, start + PAGE_SIZE);

  const persistedSearchParams: Record<string, string> = {};
  if (q) persistedSearchParams.q = q;
  if (sort !== 'last_visit') persistedSearchParams.sort = sort;

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold [color:var(--color-text-strong)]">
          Clientes
        </h1>
        <p className="text-sm [color:var(--color-text-muted)]">
          {total === 0
            ? q
              ? 'Nenhum cliente encontrado para a busca.'
              : 'Nenhum cliente cadastrado ainda.'
            : `${total} cliente${total === 1 ? '' : 's'}`}
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-4">
        <ClientsSearch initial={q} />
        <ClientsSortSelect value={sort} />
      </div>

      {total === 0 ? (
        <EmptyState searching={Boolean(q)} />
      ) : (
        <>
          <ClientsTable rows={slice} />
          <ClientsPagination
            total={total}
            page={page}
            searchParams={persistedSearchParams}
          />
        </>
      )}
    </section>
  );
}

function ClientsTable({ rows }: { rows: ClientWithStats[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((c) => (
        <li
          key={c.id}
          className="rounded-[var(--radius-lg)] border"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-surface)',
          }}
        >
          <Link
            href={`/clientes/${c.id}`}
            className="flex flex-col gap-2 rounded-[var(--radius-lg)] p-4 transition-colors hover:[background-color:var(--color-surface-hover)] sm:flex-row sm:items-center sm:gap-4"
          >
            <span
              aria-hidden="true"
              className="flex h-12 w-12 items-center justify-center rounded-full text-base font-semibold"
              style={{
                backgroundColor: 'var(--color-accent-100)',
                color: 'var(--color-accent-700)',
              }}
            >
              {c.name
                .split(' ')
                .map((w) => w[0])
                .filter(Boolean)
                .slice(0, 2)
                .join('')
                .toUpperCase() || '·'}
            </span>
            <div className="flex flex-1 flex-col gap-1">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-medium [color:var(--color-text-strong)]">
                  {c.name}
                </span>
                <span className="text-xs [color:var(--color-text-muted)]">
                  {formatPhoneBR(c.phone_e164)}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs [color:var(--color-text-muted)]">
                <span>
                  {c.visit_count} visita{c.visit_count === 1 ? '' : 's'}
                </span>
                {c.last_appointment_at ? (
                  <span>
                    Última:{' '}
                    {formatInTimeZone(
                      c.last_appointment_at,
                      BR_TIMEZONE,
                      "dd 'de' MMM yyyy",
                      { locale: ptBR },
                    )}
                  </span>
                ) : (
                  <span>Sem visitas registradas</span>
                )}
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function EmptyState({ searching }: { searching: boolean }) {
  return (
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
        👥
      </span>
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-medium [color:var(--color-text-strong)]">
          {searching ? 'Sem resultados' : 'Nenhum cliente cadastrado ainda'}
        </h2>
        <p className="max-w-md text-sm [color:var(--color-text-muted)]">
          {searching
            ? 'Tente outro nome ou telefone. A busca cobre clientes ativos do salão.'
            : 'Clientes aparecem aqui após o primeiro agendamento — manual ou via link público.'}
        </p>
      </div>
    </div>
  );
}
