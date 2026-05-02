import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CopyLinkButton } from '@/components/ui/copy-link-button';
import { ProfessionalForm } from '../professional-form';
import { ProfessionalActions } from './professional-actions';
import { CommissionTablePanel } from './commission-table-panel';
import { DEFAULT_WORKING_HOURS, type WorkingHours } from '../types';

export const dynamic = 'force-dynamic';

type Params = Promise<{ id: string }>;

export default async function EditProfissionalPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: professional } = await supabase
    .from('professionals')
    .select(
      'id, salon_id, name, slug, bio, specialties, working_hours_jsonb, commission_mode, commission_default_percent, is_active',
    )
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (!professional) {
    notFound();
  }

  // Fetch salon slug for public link.
  const { data: salonRow } = await supabase
    .from('salons')
    .select('slug')
    .eq('id', professional.salon_id)
    .maybeSingle();

  const publicPath =
    salonRow?.slug && professional.is_active
      ? `/${salonRow.slug}/${professional.slug}`
      : null;

  // Story 4.1 — fetch commission table state when professional is in TABLE mode
  const isTableMode = professional.commission_mode === 'TABLE';

  let commissionServices: Array<{
    id: string;
    name: string;
    category: string;
    commission_override_percent: number | null;
  }> = [];
  let commissionEntries: Array<{ service_id: string; percent: number }> = [];

  if (isTableMode) {
    const [{ data: services }, { data: entries }] = await Promise.all([
      supabase
        .from('services')
        .select('id, name, category, commission_override_percent')
        .eq('salon_id', professional.salon_id)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('category', { ascending: true })
        .order('name', { ascending: true }),
      supabase
        .from('professional_service_commissions')
        .select('service_id, percent')
        .eq('professional_id', professional.id),
    ]);

    commissionServices = (services ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      commission_override_percent:
        s.commission_override_percent !== null
          ? Number(s.commission_override_percent)
          : null,
    }));
    commissionEntries = (entries ?? []).map((e) => ({
      service_id: e.service_id,
      percent: Number(e.percent),
    }));
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Link
          href="/profissionais"
          className="text-xs [color:var(--color-text-muted)] hover:underline"
        >
          ← Profissionais
        </Link>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold [color:var(--color-text-strong)]">
            {professional.name}
          </h1>
          <div className="flex items-center gap-2">
            {publicPath && (
              <CopyLinkButton
                path={publicPath}
                label="Copiar link público"
                size="sm"
                variant="secondary"
              />
            )}
            <ProfessionalActions
              id={professional.id}
              isActive={professional.is_active}
            />
          </div>
        </div>
      </header>

      <ProfessionalForm
        mode="edit"
        initial={{
          id: professional.id,
          name: professional.name,
          slug: professional.slug,
          bio: professional.bio,
          specialties: professional.specialties ?? [],
          workingHours:
            (professional.working_hours_jsonb as unknown as WorkingHours) ??
            DEFAULT_WORKING_HOURS,
          commissionMode: professional.commission_mode,
          commissionDefaultPercent: Number(
            professional.commission_default_percent,
          ),
        }}
      />

      {isTableMode && (
        <CommissionTablePanel
          professionalId={professional.id}
          professionalDefaultPercent={Number(
            professional.commission_default_percent,
          )}
          services={commissionServices}
          entries={commissionEntries}
        />
      )}
    </section>
  );
}
