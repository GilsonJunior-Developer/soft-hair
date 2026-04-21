import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Step3PricesForm } from './step-3-prices-form';

type CategoryId = 'cabelo' | 'unha' | 'barba' | 'estetica';

export async function Step3Prices({
  categories,
}: {
  categories: CategoryId[];
}) {
  if (categories.length === 0) {
    return (
      <section className="flex flex-col gap-4 text-center">
        <h1 className="text-xl font-semibold [color:var(--color-text-strong)]">
          Nenhuma categoria selecionada
        </h1>
        <p className="text-sm [color:var(--color-text-muted)]">
          Volte ao passo 2 e selecione ao menos uma categoria.
        </p>
        <Link
          href="/onboarding/2"
          className="text-sm underline [color:var(--color-accent-600)]"
        >
          ← Voltar para o passo 2
        </Link>
      </section>
    );
  }

  const supabase = await createClient();
  // service_catalog is public-read — anon key OK
  const { data: services } = await supabase
    .from('service_catalog')
    .select('id, name, category, default_duration_minutes, suggested_price_brl')
    .in('category', categories)
    .order('category', { ascending: true })
    .order('name', { ascending: true })
    .limit(40);

  return (
    <Step3PricesForm
      services={(services ?? []).map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        durationMinutes: s.default_duration_minutes,
        suggestedPriceBrl: Number(s.suggested_price_brl),
      }))}
    />
  );
}
