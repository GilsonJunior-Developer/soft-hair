'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { normalizePhoneBR } from '@/lib/phone';
import type { AppointmentStatus } from '@/lib/appointment-state';

/* ----------------------------------------------------------
 * Result shape (consistent with Epic 1 actions)
 * ----------------------------------------------------------*/

export type ActionResult<T = undefined> =
  | (T extends undefined ? { ok: true } : { ok: true; data: T })
  | { ok: false; error: string; code?: string; fieldErrors?: Record<string, string> };

/* ----------------------------------------------------------
 * fetchAgendaWindow — used by /agenda Server Component
 * ----------------------------------------------------------*/

export type AgendaAppointment = {
  id: string;
  scheduledAt: string;
  endsAt: string;
  status: AppointmentStatus;
  priceFinalBrl: number;
  notes: string | null;
  client: { id: string; name: string; phone: string } | null;
  professional: { id: string; name: string };
  service: { id: string; name: string; durationMinutes: number };
};

export type AgendaProfessional = {
  id: string;
  name: string;
  slug: string;
};

type AppointmentRow = {
  id: string;
  scheduled_at: string;
  ends_at: string;
  status: AppointmentStatus;
  price_brl_final: number | string;
  notes: string | null;
  clients: { id: string; name: string; phone_e164: string } | null;
  professionals: { id: string; name: string } | null;
  services: { id: string; name: string; duration_minutes: number } | null;
};

export async function fetchAgendaWindow({
  from,
  to,
  professionalId,
}: {
  from: Date;
  to: Date;
  professionalId?: string | null;
}): Promise<{
  appointments: AgendaAppointment[];
  professionals: AgendaProfessional[];
}> {
  const supabase = await createClient();

  const proRes = await supabase
    .from('professionals')
    .select('id, name, slug')
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('name');

  const professionals: AgendaProfessional[] = (proRes.data ?? []).map((p) => ({
    id: p.id as string,
    name: p.name as string,
    slug: p.slug as string,
  }));

  let query = supabase
    .from('appointments')
    .select(
      `id, scheduled_at, ends_at, status, price_brl_final, notes,
       clients ( id, name, phone_e164 ),
       professionals ( id, name ),
       services ( id, name, duration_minutes )`,
    )
    .gte('scheduled_at', from.toISOString())
    .lt('scheduled_at', to.toISOString())
    .is('deleted_at', null)
    .order('scheduled_at');

  if (professionalId) {
    query = query.eq('professional_id', professionalId);
  }

  const res = await query;
  const rows = (res.data ?? []) as unknown as AppointmentRow[];

  const appointments: AgendaAppointment[] = rows.map((r) => ({
    id: r.id,
    scheduledAt: r.scheduled_at,
    endsAt: r.ends_at,
    status: r.status,
    priceFinalBrl: Number(r.price_brl_final),
    notes: r.notes,
    client: r.clients
      ? {
          id: r.clients.id,
          name: r.clients.name,
          phone: r.clients.phone_e164,
        }
      : null,
    professional: r.professionals
      ? { id: r.professionals.id, name: r.professionals.name }
      : { id: '', name: '—' },
    service: r.services
      ? {
          id: r.services.id,
          name: r.services.name,
          durationMinutes: r.services.duration_minutes,
        }
      : { id: '', name: '—', durationMinutes: 0 },
  }));

  return { appointments, professionals };
}

/* ----------------------------------------------------------
 * searchClientByPhone — used by appointment form combobox
 * ----------------------------------------------------------*/

export async function searchClientByPhone(
  rawPhone: string,
): Promise<ActionResult<{ id: string; name: string; phone: string } | null>> {
  const normalized = normalizePhoneBR(rawPhone);
  if (!normalized) return { ok: true, data: null };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, phone_e164')
    .eq('phone_e164', normalized)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) return { ok: false, error: 'Erro ao buscar cliente' };
  if (!data) return { ok: true, data: null };

  return {
    ok: true,
    data: { id: data.id, name: data.name, phone: data.phone_e164 },
  };
}

/* ----------------------------------------------------------
 * createAppointment — wraps RPC create_appointment_atomic
 * ----------------------------------------------------------*/

const createAppointmentSchema = z
  .object({
    professionalId: z.string().uuid(),
    serviceId: z.string().uuid(),
    scheduledAt: z.string().datetime(),
    notes: z.string().max(500).optional().nullable(),
    clientId: z.string().uuid().optional().nullable(),
    clientName: z.string().trim().min(2).max(120).optional(),
    clientPhone: z.string().optional(),
    clientEmail: z.string().email().optional().nullable(),
  })
  .refine(
    (v) => v.clientId || (v.clientName && v.clientPhone),
    { message: 'Informe o cliente existente ou nome+telefone do novo cliente' },
  );

export async function createAppointment(
  input: unknown,
): Promise<ActionResult<{ appointmentId: string }>> {
  const parsed = createAppointmentSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === 'string' && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return { ok: false, error: 'Dados inválidos', fieldErrors };
  }

  let normalizedPhone: string | null = null;
  if (parsed.data.clientPhone) {
    normalizedPhone = normalizePhoneBR(parsed.data.clientPhone);
    if (!normalizedPhone) {
      return {
        ok: false,
        error: 'Telefone inválido',
        fieldErrors: { clientPhone: 'Use formato BR com DDD' },
      };
    }
  }

  const supabase = await createClient();
  // Supabase generated types don't know about the new RPC yet; cast as never
  // until `@softhair/db` types are regenerated post-Sprint 2.A.
  const { data, error } = await (supabase.rpc as unknown as (
    name: string,
    params: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { code?: string; message?: string } | null }>)(
    'create_appointment_atomic',
    {
      p_professional_id: parsed.data.professionalId,
      p_service_id: parsed.data.serviceId,
      p_scheduled_at: parsed.data.scheduledAt,
      p_client_id: parsed.data.clientId ?? undefined,
      p_client_name: parsed.data.clientName ?? undefined,
      p_client_phone: normalizedPhone ?? undefined,
      p_client_email: parsed.data.clientEmail ?? undefined,
      p_notes: parsed.data.notes ?? undefined,
      p_source: 'MANUAL_BY_STAFF',
    },
  );

  if (error) {
    const code = error.code;
    const msg = error.message ?? '';

    if (code === '23P01') {
      return { ok: false, error: 'Horário já ocupado por outro agendamento', code: 'CONFLICT' };
    }
    if (msg.includes('invalid_transition')) {
      return { ok: false, error: 'Transição de status inválida' };
    }
    if (msg.includes('service_not_found')) {
      return { ok: false, error: 'Serviço não encontrado ou inativo' };
    }
    if (msg.includes('professional_not_found')) {
      return { ok: false, error: 'Profissional não encontrado ou inativo' };
    }
    if (msg.includes('client_not_found')) {
      return { ok: false, error: 'Cliente não encontrado' };
    }
    if (msg.includes('client_data_required')) {
      return { ok: false, error: 'Nome e telefone do cliente são obrigatórios' };
    }
    if (msg.includes('no_salon')) {
      return { ok: false, error: 'Salão não configurado' };
    }
    console.error('[createAppointment] RPC error:', error);
    return { ok: false, error: 'Erro ao criar agendamento. Tente novamente.' };
  }

  const appointmentId = (data as { id?: string } | null)?.id;
  if (!appointmentId) {
    return { ok: false, error: 'Resposta inesperada do servidor' };
  }

  revalidatePath('/agenda');
  revalidatePath('/hoje');
  return { ok: true, data: { appointmentId } };
}

/* ----------------------------------------------------------
 * transitionAppointmentStatus — Story 2.6
 * ----------------------------------------------------------*/

const transitionSchema = z.object({
  appointmentId: z.string().uuid(),
  to: z.enum(['PENDING_CONFIRMATION', 'CONFIRMED', 'COMPLETED', 'NO_SHOW', 'CANCELED']),
  reason: z.string().max(500).optional().nullable(),
});

export async function transitionAppointmentStatus(
  input: unknown,
): Promise<ActionResult<{ status: AppointmentStatus }>> {
  const parsed = transitionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Dados inválidos' };
  }

  const supabase = await createClient();
  const { data, error } = await (supabase.rpc as unknown as (
    name: string,
    params: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { code?: string; message?: string } | null }>)(
    'transition_appointment_status',
    {
      p_appointment_id: parsed.data.appointmentId,
      p_to: parsed.data.to,
      p_reason: parsed.data.reason ?? undefined,
    },
  );

  if (error) {
    const msg = error.message ?? '';
    if (msg.includes('invalid_transition')) {
      return { ok: false, error: 'Transição não permitida para este status' };
    }
    if (msg.includes('appointment_not_found')) {
      return { ok: false, error: 'Agendamento não encontrado' };
    }
    console.error('[transitionAppointmentStatus] RPC error:', error);
    return { ok: false, error: 'Erro ao atualizar status' };
  }

  revalidatePath('/agenda');
  revalidatePath('/hoje');
  const updated = data as { status: AppointmentStatus } | null;
  return {
    ok: true,
    data: { status: updated?.status ?? parsed.data.to },
  };
}
