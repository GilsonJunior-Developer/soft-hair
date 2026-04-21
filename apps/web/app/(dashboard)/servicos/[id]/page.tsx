import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ServiceForm } from '../service-form';
import { ServiceActions } from './service-actions';

export const dynamic = 'force-dynamic';

type Params = Promise<{ id: string }>;

export default async function EditServicoPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: service } = await supabase
    .from('services')
    .select(
      'id, catalog_id, name, category, duration_minutes, price_brl, commission_override_percent, is_active',
    )
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (!service) {
    notFound();
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <Link
          href="/servicos"
          className="text-xs [color:var(--color-text-muted)] hover:underline"
        >
          ← Serviços
        </Link>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold [color:var(--color-text-strong)]">
            {service.name}
          </h1>
          <ServiceActions id={service.id} isActive={service.is_active} />
        </div>
      </header>

      <ServiceForm
        mode="edit"
        initial={{
          id: service.id,
          name: service.name,
          category: service.category,
          durationMinutes: service.duration_minutes,
          priceBrl: Number(service.price_brl),
          commissionOverridePercent:
            service.commission_override_percent === null
              ? null
              : Number(service.commission_override_percent),
          isFromCatalog: service.catalog_id !== null,
        }}
      />
    </section>
  );
}
