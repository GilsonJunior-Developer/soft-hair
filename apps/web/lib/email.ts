/**
 * Transactional email delivery for SoftHair.
 *
 * Strategy (Story 2.4 MVP):
 *   - If RESEND_API_KEY + RESEND_FROM_EMAIL are set, send via Resend
 *   - Otherwise log structured email payload and return { delivered: false }
 *     (UI shows a banner informing the client that email is still being configured)
 *
 * Story 2.7 will replace the placeholder management link with a signed
 * token route; until then we link to the success page.
 */

export type BookingEmailInput = {
  to: string;
  clientName: string;
  salonName: string;
  professionalName: string;
  serviceName: string;
  scheduledAt: Date;
  manageUrl: string;
};

export type EmailDeliveryResult =
  | { delivered: true; providerMessageId: string }
  | { delivered: false; reason: 'not_configured' | 'provider_error'; detail?: string };

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

function renderBookingEmailHtml(input: BookingEmailInput): string {
  const when = formatDateTimeBR(input.scheduledAt);
  return `
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
        Você pode acompanhar ou gerenciar este agendamento pelo link abaixo:<br />
        <a href="${input.manageUrl}">${input.manageUrl}</a>
      </p>
      <p style="color:#6b7280;font-size:12px;margin-top:24px">
        Se você não reconhece este agendamento, ignore este email.
      </p>
    </div>
  `;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function sendBookingConfirmation(
  input: BookingEmailInput,
): Promise<EmailDeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    console.info('[email] Booking confirmation (not sent — Resend not configured)', {
      to: input.to,
      salon: input.salonName,
      professional: input.professionalName,
      service: input.serviceName,
      when: input.scheduledAt.toISOString(),
      manageUrl: input.manageUrl,
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
        to: input.to,
        subject: `Seu agendamento em ${input.salonName} com ${input.professionalName}`,
        html: renderBookingEmailHtml(input),
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
