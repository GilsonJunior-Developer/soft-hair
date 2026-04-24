import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const revalidate = 60;

type PublicSalon = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
};

type PublicProfessional = {
  id: string;
  salon_id: string;
  slug: string;
  name: string;
  photo_url: string | null;
  bio: string | null;
  specialties: string[];
};

type PublicService = {
  id: string;
  name: string;
  category: string;
  duration_minutes: number;
  price_brl: number;
};

type PageData = {
  salon: PublicSalon;
  professional: PublicProfessional;
  services: PublicService[];
};

type PageProps = {
  params: Promise<{ salon: string; professional: string }>;
};

async function getPageData(
  salonSlug: string,
  professionalSlug: string,
): Promise<PageData | null> {
  const supabase = await createClient();

  // The public views are not in the generated Database type yet;
  // we cast via `as never` on the view name and `returns<T>()` on the
  // response. Both views bypass RLS at the DB level (owner = postgres).
  const { data: salon, error: salonErr } = await supabase
    .from('public_salons_v' as never)
    .select('id, name, slug, city')
    .eq('slug', salonSlug)
    .maybeSingle<PublicSalon>();

  if (salonErr || !salon) return null;

  const { data: professional, error: profErr } = await supabase
    .from('public_professionals_v' as never)
    .select('id, salon_id, slug, name, photo_url, bio, specialties')
    .eq('salon_id', salon.id)
    .eq('slug', professionalSlug)
    .maybeSingle<PublicProfessional>();

  if (profErr || !professional) return null;

  const { data: services } = await supabase
    .from('public_services_v' as never)
    .select('id, name, category, duration_minutes, price_brl')
    .eq('salon_id', salon.id)
    .order('name', { ascending: true })
    .returns<PublicService[]>();

  return { salon, professional, services: services ?? [] };
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0]!)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatPriceBrl(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { salon, professional } = await params;
  const data = await getPageData(salon, professional);

  if (!data) {
    return {
      title: 'Profissional não encontrado · SoftHair',
      robots: { index: false, follow: false },
    };
  }

  const title = `${data.professional.name} · ${data.salon.name}`;
  const description =
    data.professional.bio?.trim() ||
    `Agende com ${data.professional.name} no ${data.salon.name}${
      data.salon.city ? ` em ${data.salon.city}` : ''
    } pelo SoftHair.`;

  const ogImages = data.professional.photo_url
    ? [{ url: data.professional.photo_url, alt: `Foto de ${data.professional.name}` }]
    : [];

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
      locale: 'pt_BR',
      images: ogImages,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImages.map((img) => img.url),
    },
    // MVP: no SEO indexing until after design-partner #1 approves.
    // Revisit when custom domain (softhair.com.br) is live.
    robots: { index: false, follow: false },
  };
}

export default async function PublicProfessionalPage({ params }: PageProps) {
  const { salon: salonParam, professional: professionalParam } = await params;
  const data = await getPageData(salonParam, professionalParam);

  if (!data) notFound();
  const { salon, professional, services } = data;

  const bookingHref = `/${salon.slug}/${professional.slug}/book`;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 py-10 pb-32">
      {/* Salon context header */}
      <header className="flex flex-col items-center gap-1 text-center">
        <p
          className="text-sm font-medium"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {salon.name}
          {salon.city ? ` · ${salon.city}` : ''}
        </p>
      </header>

      {/* Professional hero */}
      <section
        aria-labelledby="prof-name"
        className="flex flex-col items-center gap-4 text-center"
      >
        {professional.photo_url ? (
          <Image
            src={professional.photo_url}
            alt={`Foto de ${professional.name}`}
            width={144}
            height={144}
            priority
            className="h-36 w-36 rounded-full object-cover"
            style={{ borderWidth: 1, borderColor: 'var(--color-border)' }}
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-36 w-36 items-center justify-center rounded-full text-3xl font-semibold"
            style={{
              backgroundColor: 'var(--color-accent-100)',
              color: 'var(--color-accent-700)',
            }}
          >
            {initials(professional.name)}
          </div>
        )}

        <h1
          id="prof-name"
          className="text-3xl font-semibold"
          style={{ color: 'var(--color-text-strong)' }}
        >
          {professional.name}
        </h1>

        {professional.bio?.trim() ? (
          <p
            className="max-w-lg text-base"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {professional.bio}
          </p>
        ) : null}

        {professional.specialties.length > 0 && (
          <ul className="flex flex-wrap items-center justify-center gap-2">
            {professional.specialties.map((s) => (
              <li
                key={s}
                className="rounded-full px-3 py-1 text-xs"
                style={{
                  backgroundColor: 'var(--color-accent-50)',
                  color: 'var(--color-accent-700)',
                }}
              >
                {s}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Services list */}
      <section aria-labelledby="services-heading" className="flex flex-col gap-3">
        <h2
          id="services-heading"
          className="text-lg font-semibold"
          style={{ color: 'var(--color-text-strong)' }}
        >
          Serviços
        </h2>

        {services.length === 0 ? (
          <p
            className="rounded-[var(--radius-lg)] border p-6 text-center text-sm"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-muted)',
              backgroundColor: 'var(--color-surface)',
            }}
          >
            Nenhum serviço disponível no momento.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {services.map((service) => (
              <li
                key={service.id}
                className="flex items-center justify-between gap-4 rounded-[var(--radius-lg)] border p-4"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-surface)',
                }}
              >
                <div className="flex flex-1 flex-col gap-1">
                  <span
                    className="font-medium"
                    style={{ color: 'var(--color-text-strong)' }}
                  >
                    {service.name}
                  </span>
                  <span
                    className="text-xs"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {service.duration_minutes} min
                  </span>
                </div>
                <span
                  className="whitespace-nowrap text-base font-semibold"
                  style={{ color: 'var(--color-text-strong)' }}
                >
                  R$ {formatPriceBrl(service.price_brl)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Sticky CTA */}
      <div
        className="fixed inset-x-0 bottom-0 border-t px-6 py-4"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-bg)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0) + 16px)',
        }}
      >
        <div className="mx-auto max-w-2xl">
          <Link
            href={bookingHref}
            aria-label={`Agendar com ${professional.name}`}
            className="flex w-full items-center justify-center rounded-[var(--radius-lg)] px-6 py-3 text-base font-semibold transition-colors"
            style={{
              backgroundColor: 'var(--color-accent-600)',
              color: 'white',
            }}
          >
            Agendar agora
          </Link>
        </div>
      </div>
    </main>
  );
}
