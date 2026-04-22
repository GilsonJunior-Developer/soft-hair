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

  const services = (servicesRes.data ?? []).map((s) => ({
    id: s.id as string,
    name: s.name as string,
    durationMinutes: s.duration_minutes as number,
    priceBrl: Number(s.price_brl),
    category: s.category as string,
  }));

  return (
    <AgendaPageShell
      view={view}
      anchor={formatAnchor(anchor)}
      professionalId={professionalId}
      professionals={professionals}
      appointments={appointments}
      services={services}
      openNew={sp.new === '1'}
    />
  );
}
