/**
 * Transactional email delivery for SoftHair.
 *
 * Strategy:
 *   - If RESEND_API_KEY + RESEND_FROM_EMAIL are set, send via Resend
 *   - Otherwise log structured email payload and return { delivered: false }
 *     (flow never breaks; UI surfaces a banner where appropriate)
 *
 * Templates:
 *   - sendBookingConfirmation     (Story 2.4 — booking created)
 *   - sendAppointmentCanceled     (Story 2.7 — client-initiated cancel)
 *   - sendAppointmentRescheduled  (Story 2.7 — client-initiated reschedule)
 *
 * Design: this module is pure (no DB access). Each Server Action loads
 * the snapshot data via its RPC call and passes it here. Keeps the email
 * layer independent of auth/RLS concerns.
 */

export type EmailDeliveryResult =
  | { delivered: true; providerMessageId: string }
  | {
      delivered: false;
      reason: 'not_configured' | 'provider_error' | 'no_recipient';
      detail?: string;
    };

function formatDateTimeBR(d: Date): string {
  return d.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function deliver(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<EmailDeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    console.info('[email] Not sent — Resend not configured', {
      to: params.to,
      subject: params.subject,
    });
    return { delivered: false, reason: 'not_configured' };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: params.to,
        subject: params.subject,
        html: params.html,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[email] Resend non-2xx', res.status, text);
      return {
        delivered: false,
        reason: 'provider_error',
        detail: `status ${res.status}`,
      };
    }

    const json = (await res.json()) as { id?: string };
    return { delivered: true, providerMessageId: json.id ?? 'unknown' };
  } catch (err) {
    console.error('[email] Resend threw', err);
    return {
      delivered: false,
      reason: 'provider_error',
      detail: err instanceof Error ? err.message : 'unknown',
    };
  }
}

/* ------------------------------------------------------------
 * sendBookingConfirmation — Story 2.4 (manageUrl updated for 2.7)
 * manageUrl now points to /agendamento/{jwt}, not /book/success
 * ------------------------------------------------------------*/

export type BookingEmailInput = {
  to: string;
  clientName: string;
  salonName: string;
  professionalName: string;
  serviceName: string;
  scheduledAt: Date;
  manageUrl: string;
};

export async function sendBookingConfirmation(
  input: BookingEmailInput,
): Promise<EmailDeliveryResult> {
  const when = formatDateTimeBR(input.scheduledAt);
  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;color:#111">
      <h2 style="margin:0 0 16px">Agendamento recebido</h2>
      <p>Olá, <strong>${escapeHtml(input.clientName)}</strong>.</p>
      <p>
        Seu agendamento no <strong>${escapeHtml(input.salonName)}</strong>
        com <strong>${escapeHtml(input.professionalName)}</strong> foi recebido
        e está aguardando confirmação do salão.
      </p>
      <ul>
        <li>Serviço: <strong>${escapeHtml(input.serviceName)}</strong></li>
        <li>Quando: <strong>${escapeHtml(when)}</strong></li>
      </ul>
      <p>
        Você pode gerenciar (cancelar ou reagendar) pelo link abaixo:<br />
        <a href="${input.manageUrl}">${input.manageUrl}</a>
      </p>
      <p style="color:#6b7280;font-size:12px;margin-top:24px">
        Guarde este email — o link é único e pessoal. Se você não reconhece
        este agendamento, ignore esta mensagem.
      </p>
    </div>
  `;

  return deliver({
    to: input.to,
    subject: `Seu agendamento em ${input.salonName} com ${input.professionalName}`,
    html,
  });
}

/* ------------------------------------------------------------
 * sendAppointmentCanceled — Story 2.7
 * ------------------------------------------------------------*/

export type AppointmentCanceledInput = {
  to: string | null;
  clientName: string;
  salonName: string;
  professionalName: string;
  serviceName: string;
  scheduledAt: Date;
};

export async function sendAppointmentCanceled(
  input: AppointmentCanceledInput,
): Promise<EmailDeliveryResult> {
  if (!input.to) {
    console.info('[email] Cancel notification skipped — client email missing');
    return { delivered: false, reason: 'no_recipient' };
  }

  const when = formatDateTimeBR(input.scheduledAt);
  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;color:#111">
      <h2 style="margin:0 0 16px">Agendamento cancelado</h2>
      <p>Olá, <strong>${escapeHtml(input.clientName)}</strong>.</p>
      <p>
        Confirmamos o cancelamento do seu agendamento no
        <strong>${escapeHtml(input.salonName)}</strong> com
        <strong>${escapeHtml(input.professionalName)}</strong>.
      </p>
      <ul>
        <li>Serviço: <strong>${escapeHtml(input.serviceName)}</strong></li>
        <li>Quando era: <strong>${escapeHtml(when)}</strong></li>
      </ul>
      <p>
        Precisando remarcar, é só acessar o perfil do profissional novamente.
      </p>
    </div>
  `;

  return deliver({
    to: input.to,
    subject: `Cancelamento confirmado — ${input.salonName}`,
    html,
  });
}

/* ------------------------------------------------------------
 * sendAppointmentRescheduled — Story 2.7
 * ------------------------------------------------------------*/

export type AppointmentRescheduledInput = {
  to: string | null;
  clientName: string;
  salonName: string;
  professionalName: string;
  serviceName: string;
  scheduledAt: Date;
  manageUrl: string;
};

export async function sendAppointmentRescheduled(
  input: AppointmentRescheduledInput,
): Promise<EmailDeliveryResult> {
  if (!input.to) {
    console.info('[email] Reschedule notification skipped — client email missing');
    return { delivered: false, reason: 'no_recipient' };
  }

  const when = formatDateTimeBR(input.scheduledAt);
  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;color:#111">
      <h2 style="margin:0 0 16px">Agendamento reagendado</h2>
      <p>Olá, <strong>${escapeHtml(input.clientName)}</strong>.</p>
      <p>
        Seu novo horário no <strong>${escapeHtml(input.salonName)}</strong>
        com <strong>${escapeHtml(input.professionalName)}</strong> foi salvo.
      </p>
      <ul>
        <li>Serviço: <strong>${escapeHtml(input.serviceName)}</strong></li>
        <li>Novo horário: <strong>${escapeHtml(when)}</strong></li>
      </ul>
      <p>
        Gerencie (ou cancele, se precisar) pelo novo link:<br />
        <a href="${input.manageUrl}">${input.manageUrl}</a>
      </p>
      <p style="color:#6b7280;font-size:12px;margin-top:24px">
        O link anterior foi invalidado. Use apenas este.
      </p>
    </div>
  `;

  return deliver({
    to: input.to,
    subject: `Novo horário — ${input.salonName}`,
    html,
  });
}
