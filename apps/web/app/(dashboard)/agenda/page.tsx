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
  const debugInfo = {
    authUid: authRes.data.user?.id ?? 'null',
    countNoFilter: countNoFilterRes.count ?? 'err:' + countNoFilterRes.error?.message,
    countInWindow: countInWindowRes.count ?? 'err:' + countInWindowRes.error?.message,
    rawSample: rawAllRes.data?.map((a) => ({
      id: (a.id as string).slice(0, 8),
      t: a.scheduled_at,
      p: (a.professional_id as string).slice(0, 8),
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
          {`[DEBUG /agenda] view=${view} profFilter=${professionalId ?? 'all'} apptCount=${appointments.length} proCount=${professionals.length} svcCount=${services.length}
window: ${window.from.toISOString()} → ${window.to.toISOString()}
authUid: ${debugInfo.authUid}
countNoFilter (all appts user can SELECT): ${debugInfo.countNoFilter}
countInWindow (just window, no prof filter): ${debugInfo.countInWindow}
raw sample (top 3 by created_at): ${JSON.stringify(debugInfo.rawSample)}`}
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
