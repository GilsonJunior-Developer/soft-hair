import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { CommissionSimulator } from './commission-simulator';

export const dynamic = 'force-dynamic';

export default async function ComissaoPage() {
  const supabase = await createClient();

  const { data: professionalsData } = await supabase
    .from('professionals')
    .select(
      'id, name, commission_mode, commission_default_percent',
    )
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('name', { ascending: true });

  const { data: servicesData } = await supabase
    .from('services')
    .select('id, name, category, price_brl, commission_override_percent')
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  const { data: entriesData } = await supabase
    .from('professional_service_commissions')
    .select('professional_id, service_id, percent');

  const professionals = (professionalsData ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    commissionMode: p.commission_mode,
    commissionDefaultPercent: Number(p.commission_default_percent),
  }));

  const services = (servicesData ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    category: s.category,
    priceBrl: Number(s.price_brl),
    commissionOverridePercent:
      s.commission_override_percent !== null
        ? Number(s.commission_override_percent)
        : null,
  }));

  const entries = (entriesData ?? []).map((e) => ({
    professionalId: e.professional_id,
    serviceId: e.service_id,
    percent: Number(e.percent),
  }));

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <Link
          href="/configuracoes"
          className="text-xs hover:underline"
          style={{ color: 'var(--color-text-muted)' }}
        >
          ← Configurações
        </Link>
        <h1
          className="text-2xl font-semibold"
          style={{ color: 'var(--color-text-strong)' }}
        >
          Simulador de comissão
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Teste cenários sem afetar atendimentos já registrados. As regras
          atuais (modo do profissional + override de serviço + tabela) são
          aplicadas em tempo real.
        </p>
      </header>

      <CommissionSimulator
        professionals={professionals}
        services={services}
        entries={entries}
      />
    </section>
  );
}
