import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { BookingFlow, type BookingService } from './booking-flow';

export const revalidate = 60;

type PageProps = {
  params: Promise<{ salon: string; professional: string }>;
  searchParams: Promise<{ s?: string }>;
};

type Salon = { id: string; name: string; slug: string; city: string | null };
type Professional = {
  id: string;
  salon_id: string;
  slug: string;
  name: string;
  photo_url: string | null;
};

async function loadContext(salonSlug: string, professionalSlug: string) {
  const supabase = await createClient();

  const { data: salon } = await supabase
    .from('public_salons_v' as never)
    .select('id, name, slug, city')
    .eq('slug', salonSlug)
    .maybeSingle<Salon>();
  if (!salon) return null;

  const { data: professional } = await supabase
    .from('public_professionals_v' as never)
    .select('id, salon_id, slug, name, photo_url')
    .eq('salon_id', salon.id)
    .eq('slug', professionalSlug)
    .maybeSingle<Professional>();
  if (!professional) return null;

  const { data: servicesRaw } = await supabase
    .from('public_services_v' as never)
    .select('id, name, category, duration_minutes, price_brl')
    .eq('salon_id', salon.id)
    .order('name', { ascending: true })
    .returns<BookingService[]>();

  return {
    salon,
    professional,
    services: servicesRaw ?? [],
  };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { salon, professional } = await params;
  const ctx = await loadContext(salon, professional);
  if (!ctx) {
    return {
      title: 'Agendamento · SoftHair',
      robots: { index: false, follow: false },
    };
  }
  return {
    title: `Agendar com ${ctx.professional.name} · ${ctx.salon.name}`,
    description: `Escolha o serviço, horário e confirme seu agendamento com ${ctx.professional.name} no ${ctx.salon.name}.`,
    robots: { index: false, follow: false },
  };
}

export default async function BookPage({ params, searchParams }: PageProps) {
  const { salon: salonParam, professional: professionalParam } = await params;
  const sp = await searchParams;
  const ctx = await loadContext(salonParam, professionalParam);
  if (!ctx) notFound();

  const preselectedServiceId = sp.s && ctx.services.some((s) => s.id === sp.s)
    ? sp.s
    : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-8 pb-32">
      <header className="flex flex-col gap-1">
        <p
          className="text-xs font-medium uppercase tracking-wide"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {ctx.salon.name}
          {ctx.salon.city ? ` · ${ctx.salon.city}` : ''}
        </p>
        <h1
          className="text-2xl font-semibold"
          style={{ color: 'var(--color-text-strong)' }}
        >
          Agendar com {ctx.professional.name}
        </h1>
      </header>

      <BookingFlow
        salonSlug={ctx.salon.slug}
        salonName={ctx.salon.name}
        professionalSlug={ctx.professional.slug}
        professionalName={ctx.professional.name}
        services={ctx.services}
        preselectedServiceId={preselectedServiceId}
      />
    </main>
  );
}
