'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { normalizePhoneBR } from '@/lib/phone';
import { LGPD_CONSENT_COPY } from '@/lib/booking/consent';
import { hashConsentCopy } from '@/lib/booking/consent-hash';
import { sendBookingConfirmation } from '@/lib/email';

export type ActionResult<T = undefined> =
  | (T extends undefined ? { ok: true } : { ok: true; data: T })
  | {
      ok: false;
      error: string;
      code?: string;
      fieldErrors?: Record<string, string>;
    };

/* ------------------------------------------------------------
 * computeAvailability — wraps compute_public_availability RPC
 * ------------------------------------------------------------*/

export type AvailabilityResult = {
  slots: string[];
};

export async function computeAvailability(params: {
  salonSlug: string;
  professionalSlug: string;
  serviceId: string;
  from: string;
  to: string;
}): Promise<ActionResult<AvailabilityResult>> {
  const supabase = await createClient();

  const { data, error } = await (
    supabase.rpc as unknown as (
      name: string,
      args: Record<string, unknown>,
    ) => Promise<{
      data: Array<{ slot_at: string }> | null;
      error: { message?: string; code?: string } | null;
    }>
  )('compute_public_availability', {
    p_salon_slug: params.salonSlug,
    p_professional_slug: params.professionalSlug,
    p_service_id: params.serviceId,
    p_from: params.from,
    p_to: params.to,
  });

  if (error) {
    console.error('[computeAvailability] RPC error', error);
    return { ok: false, error: 'Não foi possível carregar horários' };
  }

  const slots = (data ?? []).map((row) => row.slot_at);
  return { ok: true, data: { slots } };
}

/* ------------------------------------------------------------
 * createBooking — wraps create_public_booking_atomic RPC
 * ------------------------------------------------------------*/

const createBookingSchema = z.object({
  salonSlug: z.string().min(1),
  professionalSlug: z.string().min(1),
  serviceId: z.string().uuid(),
  scheduledAt: z.string().datetime(),
  clientName: z.string().trim().min(2).max(120),
  clientEmail: z.string().email().max(254),
  clientPhone: z.string().min(8),
  lgpdConsent: z.literal(true),
});

export type CreateBookingResult = {
  appointmentId: string;
  cancelToken: string;
  emailDelivered: boolean;
};

export async function createBooking(
  input: unknown,
): Promise<ActionResult<CreateBookingResult>> {
  const parsed = createBookingSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === 'string' && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    const consentIssue = parsed.error.issues.find(
      (i) => i.path[0] === 'lgpdConsent',
    );
    if (consentIssue) {
      return {
        ok: false,
        error: 'Você precisa aceitar o uso dos seus dados para agendar',
        code: 'CONSENT_REQUIRED',
        fieldErrors,
      };
    }
    return { ok: false, error: 'Dados inválidos', fieldErrors };
  }

  const normalizedPhone = normalizePhoneBR(parsed.data.clientPhone);
  if (!normalizedPhone) {
    return {
      ok: false,
      error: 'Telefone inválido',
      fieldErrors: { clientPhone: 'Use o formato (11) 9xxxx-xxxx' },
    };
  }

  const supabase = await createClient();

  type RpcRow = {
    appointment_id: string;
    cancel_token: string;
    scheduled_at: string;
    ends_at: string;
    salon_name: string;
    salon_slug: string;
    professional_name: string;
    service_name: string;
    price_brl: number | string;
  };

  const { data, error } = await (
    supabase.rpc as unknown as (
      name: string,
      args: Record<string, unknown>,
    ) => Promise<{
      data: RpcRow[] | null;
      error: { message?: string; code?: string } | null;
    }>
  )('create_public_booking_atomic', {
    p_salon_slug: parsed.data.salonSlug,
    p_professional_slug: parsed.data.professionalSlug,
    p_service_id: parsed.data.serviceId,
    p_scheduled_at: parsed.data.scheduledAt,
    p_client_name: parsed.data.clientName,
    p_client_email: parsed.data.clientEmail,
    p_client_phone: normalizedPhone,
    p_lgpd_consent_text_hash: hashConsentCopy(LGPD_CONSENT_COPY),
  });

  if (error) {
    const msg = error.message ?? '';
    if (error.code === '23P01') {
      return {
        ok: false,
        error: 'Esse horário acabou de ser reservado. Escolha outro.',
        code: 'CONFLICT',
      };
    }
    if (msg.includes('scheduled_in_past')) {
      return { ok: false, error: 'Esse horário já passou' };
    }
    if (msg.includes('salon_not_found')) {
      return { ok: false, error: 'Salão não encontrado' };
    }
    if (msg.includes('professional_not_found')) {
      return { ok: false, error: 'Profissional não encontrado' };
    }
    if (msg.includes('service_not_found')) {
      return { ok: false, error: 'Serviço indisponível' };
    }
    if (msg.includes('invalid_email')) {
      return { ok: false, error: 'Email inválido' };
    }
    if (msg.includes('invalid_phone')) {
      return { ok: false, error: 'Telefone inválido' };
    }
    if (msg.includes('consent_required')) {
      return { ok: false, error: 'É necessário aceitar a LGPD' };
    }
    console.error('[createBooking] RPC error', error);
    return { ok: false, error: 'Não foi possível concluir o agendamento' };
  }

  const row = data?.[0];
  if (!row) {
    return { ok: false, error: 'Resposta inesperada do servidor' };
  }

  console.info('[analytics] booking_completed', {
    appointmentId: row.appointment_id,
    salonSlug: row.salon_slug,
    serviceName: row.service_name,
    source: 'PUBLIC_LINK',
  });

  const manageUrl = absoluteUrl(
    `/${row.salon_slug}/${parsed.data.professionalSlug}/book/success/${row.appointment_id}?t=${row.cancel_token}`,
  );

  const emailResult = await sendBookingConfirmation({
    to: parsed.data.clientEmail,
    clientName: parsed.data.clientName,
    salonName: row.salon_name,
    professionalName: row.professional_name,
    serviceName: row.service_name,
    scheduledAt: new Date(row.scheduled_at),
    manageUrl,
  });

  return {
    ok: true,
    data: {
      appointmentId: row.appointment_id,
      cancelToken: row.cancel_token,
      emailDelivered: emailResult.delivered,
    },
  };
}

function absoluteUrl(path: string): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  return `${base.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}
