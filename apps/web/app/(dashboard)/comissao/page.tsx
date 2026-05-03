import { createClient } from '@/lib/supabase/server';
import { fetchCommissionReportSummary } from './actions';
import { parsePeriodSearchParams, formatYyyyMmDdSp } from './period';
import { CommissionReportClient } from './commission-report-client';

export const dynamic = 'force-dynamic';

export default async function ComissaoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const fromRaw = typeof sp.from === 'string' ? sp.from : undefined;
  const toRaw = typeof sp.to === 'string' ? sp.to : undefined;

  const window = parsePeriodSearchParams(fromRaw, toRaw);

  // Salon slug for CSV filename — best-effort. Falls back to "salao" if any step fails.
  const salonSlug = await fetchSalonSlugBestEffort();

  const summaryRes = await fetchCommissionReportSummary({
    from: window.from,
    to: window.to,
  });

  if (!summaryRes.ok) {
    return (
      <section className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold [color:var(--color-text-strong)]">
          Comissão
        </h1>
        <p
          role="alert"
          className="rounded-[var(--radius-md)] border p-4 text-sm"
          style={{
            borderColor: 'var(--color-error-300, #fca5a5)',
            color: 'var(--color-error, #b91c1c)',
            backgroundColor: 'var(--color-error-50, #fef2f2)',
          }}
        >
          {summaryRes.error}
        </p>
      </section>
    );
  }

  return (
    <CommissionReportClient
      initialSummary={summaryRes.data}
      fromYyyyMmDd={formatYyyyMmDdSp(window.from)}
      toYyyyMmDd={formatYyyyMmDdSp(window.to)}
      salonSlug={salonSlug}
    />
  );
}

async function fetchSalonSlugBestEffort(): Promise<string> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 'salao';

    const { data: userRow } = await supabase
      .from('users')
      .select('default_salon_id')
      .eq('id', user.id)
      .maybeSingle();
    const salonId = userRow?.default_salon_id;
    if (!salonId) return 'salao';

    const { data: salonRow } = await supabase
      .from('salons')
      .select('slug')
      .eq('id', salonId)
      .maybeSingle();
    return (salonRow?.slug as string) ?? 'salao';
  } catch {
    return 'salao';
  }
}
