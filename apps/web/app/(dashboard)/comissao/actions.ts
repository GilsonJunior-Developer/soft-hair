'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import type {
  CommissionReportSummary,
  CommissionRow,
  ProfessionalAggregate,
} from './types';

/* ----------------------------------------------------------
 * Result shape (consistent with Epic 1+2 actions).
 * ----------------------------------------------------------*/
export type ActionResult<T = undefined> =
  | (T extends undefined ? { ok: true } : { ok: true; data: T })
  | { ok: false; error: string };

/* ----------------------------------------------------------
 * Input validation: period boundaries.
 * Caller (Server Component) provides UTC Date instants computed from SP
 * timezone (see ./period.ts). Zod here is the boundary check — defense in
 * depth against future direct callers.
 * ----------------------------------------------------------*/
const periodSchema = z
  .object({
    from: z.coerce.date(),
    to: z.coerce.date(),
  })
  .refine(({ from, to }) => from < to, {
    message: 'período inválido: from deve ser anterior a to',
  });

const drilldownSchema = periodSchema.and(
  z.object({ professionalId: z.string().uuid() }),
);

/* ----------------------------------------------------------
 * fetchCommissionReportSummary — Task 1
 *
 * Aggregation strategy: fetch raw `commission_entries` rows in the period,
 * reduce in JS to per-professional aggregates. See `.ai/decision-log-4.3.md`
 * D-003 for why JS reduce over PostgREST aggregation at MVP scale.
 *
 * RLS auto-scopes via the user session — no manual salon filter needed.
 * ----------------------------------------------------------*/
export async function fetchCommissionReportSummary(
  input: unknown,
): Promise<ActionResult<CommissionReportSummary>> {
  const parsed = periodSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Período inválido. Verifique as datas selecionadas.' };
  }
  const { from, to } = parsed.data;

  const supabase = await createClient();

  // Step 1: fetch raw commission_entries within window (created_at default).
  // No PostgREST embed — relations resolved separately per
  // `feedback_no_postgrest_embed.md` convention (origin: Story 4.2 hotfix PR #33).
  const { data: entries, error: entriesErr } = await supabase
    .from('commission_entries')
    .select(
      'id, professional_id, service_price_brl, commission_amount_brl, created_at',
    )
    .gte('created_at', from.toISOString())
    .lt('created_at', to.toISOString());

  if (entriesErr) {
    console.error('[fetchCommissionReportSummary] entries select error:', entriesErr);
    return { ok: false, error: 'Erro ao carregar comissões. Tente novamente.' };
  }

  type EntryRow = {
    id: string;
    professional_id: string;
    service_price_brl: number | string;
    commission_amount_brl: number | string;
    created_at: string;
  };
  const rows = (entries ?? []) as EntryRow[];

  if (rows.length === 0) {
    return {
      ok: true,
      data: {
        fromIso: from.toISOString(),
        toIso: to.toISOString(),
        rows: [],
        totals: { appointments: 0, revenueBrl: 0, commissionBrl: 0 },
      },
    };
  }

  // Step 2: reduce per professional.
  const aggMap = new Map<
    string,
    { appointments: number; revenueBrl: number; commissionBrl: number }
  >();
  for (const entry of rows) {
    const cur = aggMap.get(entry.professional_id) ?? {
      appointments: 0,
      revenueBrl: 0,
      commissionBrl: 0,
    };
    cur.appointments += 1;
    cur.revenueBrl += Number(entry.service_price_brl);
    cur.commissionBrl += Number(entry.commission_amount_brl);
    aggMap.set(entry.professional_id, cur);
  }

  // Step 3: resolve professional names via separate IN query.
  const professionalIds = [...aggMap.keys()];
  const { data: pros, error: prosErr } = await supabase
    .from('professionals')
    .select('id, name')
    .in('id', professionalIds);

  if (prosErr) {
    console.error(
      '[fetchCommissionReportSummary] professionals select error:',
      prosErr,
    );
    return { ok: false, error: 'Erro ao carregar profissionais. Tente novamente.' };
  }

  const nameById = new Map<string, string>(
    (pros ?? []).map((p) => [p.id as string, p.name as string]),
  );

  // Step 4: build aggregates sorted by commissionBrl DESC.
  const aggregates: ProfessionalAggregate[] = [...aggMap.entries()]
    .map(([professionalId, agg]) => ({
      professionalId,
      professionalName: nameById.get(professionalId) ?? '—',
      appointments: agg.appointments,
      revenueBrl: roundBrl(agg.revenueBrl),
      commissionBrl: roundBrl(agg.commissionBrl),
    }))
    .sort((a, b) => b.commissionBrl - a.commissionBrl);

  const totals = aggregates.reduce(
    (sum, r) => ({
      appointments: sum.appointments + r.appointments,
      revenueBrl: sum.revenueBrl + r.revenueBrl,
      commissionBrl: sum.commissionBrl + r.commissionBrl,
    }),
    { appointments: 0, revenueBrl: 0, commissionBrl: 0 },
  );

  return {
    ok: true,
    data: {
      fromIso: from.toISOString(),
      toIso: to.toISOString(),
      rows: aggregates,
      totals: {
        appointments: totals.appointments,
        revenueBrl: roundBrl(totals.revenueBrl),
        commissionBrl: roundBrl(totals.commissionBrl),
      },
    },
  };
}

/* ----------------------------------------------------------
 * fetchCommissionReportRows — Task 2
 *
 * Drill-down: per-(professional, period) atendimento rows, chronologically.
 * Resolves appointment + client + service via 3 parallel IN queries — NO
 * PostgREST embed.
 * ----------------------------------------------------------*/
export async function fetchCommissionReportRows(
  input: unknown,
): Promise<ActionResult<CommissionRow[]>> {
  const parsed = drilldownSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Parâmetros inválidos.' };
  }
  const { from, to, professionalId } = parsed.data;

  const supabase = await createClient();

  const { data: entries, error: entriesErr } = await supabase
    .from('commission_entries')
    .select(
      'id, appointment_id, service_price_brl, percent_applied, commission_amount_brl',
    )
    .eq('professional_id', professionalId)
    .gte('created_at', from.toISOString())
    .lt('created_at', to.toISOString());

  if (entriesErr) {
    console.error('[fetchCommissionReportRows] entries error:', entriesErr);
    return { ok: false, error: 'Erro ao carregar atendimentos.' };
  }

  type EntryRow = {
    id: string;
    appointment_id: string;
    service_price_brl: number | string;
    percent_applied: number | string;
    commission_amount_brl: number | string;
  };
  const rows = (entries ?? []) as EntryRow[];
  if (rows.length === 0) return { ok: true, data: [] };

  const appointmentIds = [...new Set(rows.map((r) => r.appointment_id))];

  // Step 1: fetch appointments (need scheduled_at + client_id + service_id).
  const { data: appointments, error: apptErr } = await supabase
    .from('appointments')
    .select('id, scheduled_at, client_id, service_id')
    .in('id', appointmentIds);
  if (apptErr) {
    console.error('[fetchCommissionReportRows] appointments error:', apptErr);
    return { ok: false, error: 'Erro ao carregar agendamentos.' };
  }
  type ApptRow = {
    id: string;
    scheduled_at: string;
    client_id: string;
    service_id: string;
  };
  const apptList = (appointments ?? []) as ApptRow[];

  const clientIds = [...new Set(apptList.map((a) => a.client_id))];
  const serviceIds = [...new Set(apptList.map((a) => a.service_id))];

  // Step 2: resolve clients + services in parallel.
  const [clientsRes, servicesRes] = await Promise.all([
    supabase.from('clients').select('id, name').in('id', clientIds),
    supabase.from('services').select('id, name').in('id', serviceIds),
  ]);

  if (clientsRes.error) {
    console.error('[fetchCommissionReportRows] clients error:', clientsRes.error);
    return { ok: false, error: 'Erro ao carregar clientes.' };
  }
  if (servicesRes.error) {
    console.error('[fetchCommissionReportRows] services error:', servicesRes.error);
    return { ok: false, error: 'Erro ao carregar serviços.' };
  }

  const apptById = new Map(apptList.map((a) => [a.id, a]));
  const clientNameById = new Map(
    (clientsRes.data ?? []).map((c) => [c.id as string, c.name as string]),
  );
  const serviceNameById = new Map(
    (servicesRes.data ?? []).map((s) => [s.id as string, s.name as string]),
  );

  // Step 3: assemble + sort by scheduledAt ASC.
  const assembled: CommissionRow[] = rows
    .map((r) => {
      const appt = apptById.get(r.appointment_id);
      return {
        commissionEntryId: r.id,
        appointmentId: r.appointment_id,
        scheduledAt: appt?.scheduled_at ?? '',
        clientName: appt ? (clientNameById.get(appt.client_id) ?? '—') : '—',
        serviceName: appt ? (serviceNameById.get(appt.service_id) ?? '—') : '—',
        servicePriceBrl: Number(r.service_price_brl),
        percentApplied: Number(r.percent_applied),
        commissionAmountBrl: Number(r.commission_amount_brl),
      };
    })
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

  return { ok: true, data: assembled };
}

/**
 * Round to 2 decimal places via integer cents to avoid float drift in JS sums.
 */
function roundBrl(value: number): number {
  return Math.round(value * 100) / 100;
}
