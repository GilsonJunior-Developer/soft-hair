import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CopyLinkButton } from '@/components/ui/copy-link-button';
import { ProfessionalForm } from '../professional-form';
import { ProfessionalActions } from './professional-actions';
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
    </section>
  );
}
