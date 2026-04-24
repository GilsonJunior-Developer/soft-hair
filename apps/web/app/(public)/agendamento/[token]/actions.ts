'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  verifyAppointmentToken,
  signAppointmentToken,
} from '@/lib/appointment-token';
import {
  sendAppointmentCanceled,
  sendAppointmentRescheduled,
} from '@/lib/email';

export type ActionResult<T = undefined> =
  | (T extends undefined ? { ok: true } : { ok: true; data: T })
  | {
      ok: false;
      error: string;
      code?: string;
    };

/* ------------------------------------------------------------
 * cancelViaToken — verify JWT, load snapshot for email, then cancel
 * ------------------------------------------------------------*/

export type CancelResult = {
  appointmentId: string;
  status: string;
  canceledAt: string;
  emailDelivered: boolean;
};

type AppointmentSnapshot = {
  appointment_id: string;
  scheduled_at: string;
  status: string;
  client_name: string;
  client_email: string | null;
  salon_name: string;
  salon_slug: string;
  professional_name: string;
  professional_slug: string;
  service_id: string;
  service_name: string;
  service_duration_minutes: number;
  price_brl: number | string;
  cancel_window_hours: number;
};

async function loadSnapshot(
  appointmentId: string,
  cancelToken: string,
): Promise<AppointmentSnapshot | null> {
  const supabase = await createClient();
  const { data, error } = await (
    supabase.rpc as unknown as (
      name: string,
      args: Record<string, unknown>,
    ) => Promise<{
      data: AppointmentSnapshot[] | null;
      error: { message?: string } | null;
    }>
  )('get_public_appointment', {
    p_appointment_id: appointmentId,
    p_cancel_token: cancelToken,
  });
  if (error || !data || data.length === 0) return null;
  return data[0]!;
}

export async function cancelViaToken(
  token: string,
): Promise<ActionResult<CancelResult>> {
  const verified = await verifyAppointmentToken(token);
  if (!verified.ok) {
    return mapTokenError(verified.reason);
  }

  const snapshot = await loadSnapshot(verified.appointmentId, verified.cancelToken);
  if (!snapshot) {
    return {
      ok: false,
      error: 'Agendamento não encontrado ou link inválido.',
      code: 'NOT_FOUND',
    };
  }

  const supabase = await createClient();
  const { data, error } = await (
    supabase.rpc as unknown as (
      name: string,
      args: Record<string, unknown>,
    ) => Promise<{
      data:
        | Array<{
            appointment_id: string;
            status: string;
            canceled_at: string;
          }>
        | null;
      error: { message?: string; code?: string } | null;
    }>
  )('cancel_public_appointment', {
    p_appointment_id: verified.appointmentId,
    p_cancel_token: verified.cancelToken,
    p_reason: 'cancelled_by_client',
  });

  if (error) {
    console.error('[cancelViaToken] RPC error', error);
    const translated = translateRpcError(error.message ?? '');
    return translated ?? { ok: false, error: 'Não foi possível cancelar' };
  }

  const row = data?.[0];
  if (!row) {
    return { ok: false, error: 'Resposta inesperada do servidor' };
  }

  let emailDelivered = false;
  try {
    const emailRes = await sendAppointmentCanceled({
      to: snapshot.client_email,
      clientName: snapshot.client_name,
      salonName: snapshot.salon_name,
      professionalName: snapshot.professional_name,
      serviceName: snapshot.service_name,
      scheduledAt: new Date(snapshot.scheduled_at),
    });
    emailDelivered = emailRes.delivered;
  } catch (err) {
    console.error('[cancelViaToken] cancel email threw', err);
  }

  revalidatePath('/agenda');
  revalidatePath('/hoje');

  return {
    ok: true,
    data: {
      appointmentId: row.appointment_id,
      status: row.status,
      canceledAt: row.canceled_at,
      emailDelivered,
    },
  };
}

/* ------------------------------------------------------------
 * rescheduleViaToken — verify JWT, load snapshot, swap via RPC, re-sign
 * ------------------------------------------------------------*/

const rescheduleSchema = z.object({
  newScheduledAt: z.string().datetime({ offset: true }),
});

export type RescheduleResult = {
  newAppointmentId: string;
  newToken: string;
  scheduledAt: string;
  emailDelivered: boolean;
};

export async function rescheduleViaToken(
  token: string,
  input: unknown,
): Promise<ActionResult<RescheduleResult>> {
  const verified = await verifyAppointmentToken(token);
  if (!verified.ok) {
    return mapTokenError(verified.reason);
  }

  const parsed = rescheduleSchema.safeParse(input);
  if (!parsed.success) {
    console.error('[rescheduleViaToken] Zod validation failed', {
      issues: parsed.error.issues,
    });
    return { ok: false, error: 'Horário inválido' };
  }

  const snapshot = await loadSnapshot(verified.appointmentId, verified.cancelToken);
  if (!snapshot) {
    return {
      ok: false,
      error: 'Agendamento não encontrado ou link inválido.',
      code: 'NOT_FOUND',
    };
  }

  const supabase = await createClient();

  type Row = {
    appointment_id: string;
    cancel_token: string;
    scheduled_at: string;
    ends_at: string;
    salon_name: string;
    salon_slug: string;
    professional_name: string;
    professional_slug: string;
    service_name: string;
    price_brl: number | string;
  };

  const { data, error } = await (
    supabase.rpc as unknown as (
      name: string,
      args: Record<string, unknown>,
    ) => Promise<{
      data: Row[] | null;
      error: { message?: string; code?: string } | null;
    }>
  )('reschedule_public_appointment', {
    p_old_appointment_id: verified.appointmentId,
    p_old_cancel_token: verified.cancelToken,
    p_new_scheduled_at: parsed.data.newScheduledAt,
  });

  if (error) {
    if (error.code === '23P01') {
      return {
        ok: false,
        error: 'Esse horário acabou de ser reservado. Escolha outro.',
        code: 'CONFLICT',
      };
    }
    console.error('[rescheduleViaToken] RPC error', error);
    const translated = translateRpcError(error.message ?? '');
    return translated ?? { ok: false, error: 'Não foi possível reagendar' };
  }

  const row = data?.[0];
  if (!row) {
    return { ok: false, error: 'Resposta inesperada do servidor' };
  }

  const newToken = await signAppointmentToken({
    appointmentId: row.appointment_id,
    cancelToken: row.cancel_token,
    scheduledAt: new Date(row.scheduled_at),
  });

  const manageUrl = absoluteUrl(`/agendamento/${newToken}`);

  let emailDelivered = false;
  try {
    const emailRes = await sendAppointmentRescheduled({
      to: snapshot.client_email,
      clientName: snapshot.client_name,
      salonName: row.salon_name,
      professionalName: row.professional_name,
      serviceName: row.service_name,
      scheduledAt: new Date(row.scheduled_at),
      manageUrl,
    });
    emailDelivered = emailRes.delivered;
  } catch (err) {
    console.error('[rescheduleViaToken] reschedule email threw', err);
  }

  revalidatePath('/agenda');
  revalidatePath('/hoje');

  return {
    ok: true,
    data: {
      newAppointmentId: row.appointment_id,
      newToken,
      scheduledAt: row.scheduled_at,
      emailDelivered,
    },
  };
}

/* ------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------*/

function mapTokenError(
  reason: 'expired' | 'invalid' | 'missing_secret',
): { ok: false; error: string; code: string } {
  if (reason === 'expired') {
    return {
      ok: false,
      error: 'Este link expirou. Entre em contato com o salão para alterações.',
      code: 'TOKEN_EXPIRED',
    };
  }
  if (reason === 'missing_secret') {
    return {
      ok: false,
      error: 'Servidor não está configurado para tokens. Fale com o salão.',
      code: 'MISSING_SECRET',
    };
  }
  return {
    ok: false,
    error: 'Link inválido.',
    code: 'TOKEN_INVALID',
  };
}

function translateRpcError(
  msg: string,
): { ok: false; error: string; code: string } | null {
  if (msg.includes('not_found_or_token_mismatch')) {
    return {
      ok: false,
      error: 'Agendamento não encontrado ou link inválido.',
      code: 'NOT_FOUND',
    };
  }
  if (msg.includes('already_terminal')) {
    return {
      ok: false,
      error: 'Este agendamento já foi finalizado ou cancelado.',
      code: 'ALREADY_TERMINAL',
    };
  }
  if (msg.includes('window_closed')) {
    const match = msg.match(/DETAIL:\s*(\d+)/);
    const hours = match ? match[1] : '24';
    return {
      ok: false,
      error: `Cancelamentos devem ser feitos com ${hours}h de antecedência. Entre em contato com o salão se precisar desmarcar agora.`,
      code: 'WINDOW_CLOSED',
    };
  }
  if (msg.includes('scheduled_in_past')) {
    return {
      ok: false,
      error: 'Esse horário já passou.',
      code: 'SCHEDULED_IN_PAST',
    };
  }
  return null;
}

function absoluteUrl(path: string): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000');
  return `${base.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}
