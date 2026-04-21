import { createClient } from '@/lib/supabase/server';
import {
  computeWindow,
  formatAnchor,
  isAgendaView,
  parseAnchor,
  type AgendaView,
} from '@/lib/agenda/date-range';
import { fetchAgendaWindow } from './actions';
import { AgendaPageShell } from '@/components/agenda/agenda-page-shell';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{
  view?: string;
  date?: string;
  professional?: string;
  new?: string;
}>;

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const view: AgendaView = isAgendaView(sp.view) ? sp.view : 'day';
  const anchor = parseAnchor(sp.date);
  const window = computeWindow(view, anchor);
  const professionalId = sp.professional && sp.professional !== 'all'
    ? sp.professional
    : null;

  const { appointments, professionals } = await fetchAgendaWindow({
    from: window.from,
    to: window.to,
    professionalId,
  });

  // Prefetch services for the "New appointment" form
  const supabase = await createClient();
  const servicesRes = await supabase
    .from('services')
    .select('id, name, duration_minutes, price_brl, category')
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('name');

  // DEBUG: diagnostic queries (will be removed after Sprint 2.A)
  const authRes = await supabase.auth.getUser();
  const countNoFilterRes = await supabase
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null);
  const countInWindowRes = await supabase
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .gte('scheduled_at', window.from.toISOString())
    .lt('scheduled_at', window.to.toISOString())
    .is('deleted_at', null);
  const rawAllRes = await supabase
    .from('appointments')
    .select('id, scheduled_at, professional_id, salon_id, status, deleted_at')
    .order('created_at', { ascending: false })
    .limit(3);

  // Test 3 variants of professional filter to pinpoint `.eq` issue:
  const testProId = professionalId ?? null;
  const eqTestRes = testProId
    ? await supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('professional_id', testProId)
    : null;
  const inTestRes = testProId
    ? await supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .in('professional_id', [testProId])
    : null;
  const filterTestRes = testProId
    ? await supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .filter('professional_id', 'eq', testProId)
    : null;

  // Exact replica of fetchAgendaWindow query, inline in the Server Component
  let inlineQuery = supabase
    .from('appointments')
    .select(
      'id, scheduled_at, ends_at, status, price_brl_final, notes, client_id, professional_id, service_id',
    )
    .gte('scheduled_at', window.from.toISOString())
    .lt('scheduled_at', window.to.toISOString())
    .is('deleted_at', null)
    .order('scheduled_at');
  if (testProId) {
    inlineQuery = inlineQuery.eq('professional_id', testProId);
  }
  const inlineRes = await inlineQuery;

  const debugInfo = {
    authUid: authRes.data.user?.id ?? 'null',
    profFilterRaw: JSON.stringify(testProId),
    profFilterLen: testProId?.length ?? 0,
    countNoFilter: countNoFilterRes.count ?? 'err:' + countNoFilterRes.error?.message,
    countInWindow: countInWindowRes.count ?? 'err:' + countInWindowRes.error?.message,
    eqTest: eqTestRes?.count ?? (eqTestRes?.error?.message ?? 'skipped'),
    inTest: inTestRes?.count ?? (inTestRes?.error?.message ?? 'skipped'),
    filterTest: filterTestRes?.count ?? (filterTestRes?.error?.message ?? 'skipped'),
    inlineReplica: inlineRes.data?.length ?? `err:${inlineRes.error?.message}`,
    rawSample: rawAllRes.data?.map((a) => ({
      id: (a.id as string).slice(0, 8),
      t: a.scheduled_at,
      pFull: a.professional_id,
      pMatch: a.professional_id === testProId,
      s: (a.salon_id as string).slice(0, 8),
      st: a.status,
    })) ?? `err:${rawAllRes.error?.message}`,
  };

  const services = (servicesRes.data ?? []).map((s) => ({
    id: s.id as string,
    name: s.name as string,
    durationMinutes: s.duration_minutes as number,
    priceBrl: Number(s.price_brl),
    category: s.category as string,
  }));

  const isProdLike =
    process.env.NODE_ENV === 'production' &&
    process.env.VERCEL_ENV === 'production';

  return (
    <>
      {!isProdLike && (
        <pre
          style={{
            fontSize: 10,
            padding: 8,
            marginBottom: 8,
            background: '#fffbeb',
            border: '1px dashed #d97706',
            borderRadius: 6,
            color: '#78350f',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
        >
          {`[DEBUG /agenda build=${process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local-dev'}] view=${view} apptCount=${appointments.length} proCount=${professionals.length} svcCount=${services.length}
window: ${window.from.toISOString()} → ${window.to.toISOString()}
authUid: ${debugInfo.authUid}
profFilterRaw: ${debugInfo.profFilterRaw} (len=${debugInfo.profFilterLen})
countNoFilter: ${debugInfo.countNoFilter}
countInWindow: ${debugInfo.countInWindow}
eqTest (.eq): ${debugInfo.eqTest}
inTest (.in): ${debugInfo.inTest}
filterTest (.filter): ${debugInfo.filterTest}
inlineReplica (exact same query as fetchAgendaWindow): ${debugInfo.inlineReplica}
raw sample: ${JSON.stringify(debugInfo.rawSample)}`}
        </pre>
      )}
      <AgendaPageShell
        view={view}
        anchor={formatAnchor(anchor)}
        professionalId={professionalId}
        professionals={professionals}
        appointments={appointments}
        services={services}
        openNew={sp.new === '1'}
      />
    </>
  );
}
