'use client';

import { useEffect, useState, useTransition } from 'react';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { BR_TIMEZONE } from '@/lib/agenda/date-range';
import { formatPhoneBR, normalizePhoneBR } from '@/lib/phone';
import {
  createAppointment,
  searchClientByPhone,
  type AgendaProfessional,
} from '@/app/(dashboard)/agenda/actions';

type Service = {
  id: string;
  name: string;
  durationMinutes: number;
  priceBrl: number;
  category: string;
};

const HOURS = Array.from({ length: (22 - 7) * 4 }).map((_, i) => {
  const totalMin = 7 * 60 + i * 15;
  const h = String(Math.floor(totalMin / 60)).padStart(2, '0');
  const m = String(totalMin % 60).padStart(2, '0');
  return `${h}:${m}`;
});

function todayDateISO(): string {
  return formatInTimeZone(new Date(), BR_TIMEZONE, 'yyyy-MM-dd');
}

export function AppointmentForm({
  professionals,
  services,
  defaultScheduledAt,
  defaultProfessionalId,
  onSuccess,
  onCancel,
}: {
  professionals: AgendaProfessional[];
  services: Service[];
  defaultScheduledAt?: string | null;
  defaultProfessionalId?: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const initialDate = defaultScheduledAt
    ? formatInTimeZone(new Date(defaultScheduledAt), BR_TIMEZONE, 'yyyy-MM-dd')
    : todayDateISO();
  const initialTime = defaultScheduledAt
    ? formatInTimeZone(new Date(defaultScheduledAt), BR_TIMEZONE, 'HH:mm')
    : '09:00';

  const [phone, setPhone] = useState('');
  const [matchedClientId, setMatchedClientId] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [serviceId, setServiceId] = useState(services[0]?.id ?? '');
  const [professionalId, setProfessionalId] = useState(
    defaultProfessionalId ?? professionals[0]?.id ?? '',
  );
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime);
  const [notes, setNotes] = useState('');
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generic, setGeneric] = useState<string | null>(null);

  const selectedService = services.find((s) => s.id === serviceId) ?? null;

  // Debounced client lookup
  useEffect(() => {
    const normalized = normalizePhoneBR(phone);
    if (!normalized) {
      setMatchedClientId(null);
      return;
    }
    const t = setTimeout(async () => {
      const res = await searchClientByPhone(normalized);
      if (res.ok && res.data) {
        setMatchedClientId(res.data.id);
        setClientName(res.data.name);
      } else {
        setMatchedClientId(null);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [phone]);

  function onSubmit() {
    setFieldErrors({});
    setGeneric(null);

    const [hh, mm] = time.split(':');
    const local = new Date(`${date}T${hh}:${mm}:00`);
    const utc = fromZonedTime(local, BR_TIMEZONE);

    startTransition(async () => {
      const res = await createAppointment({
        professionalId,
        serviceId,
        scheduledAt: utc.toISOString(),
        clientId: matchedClientId ?? undefined,
        clientName: matchedClientId ? undefined : clientName,
        clientPhone: matchedClientId ? undefined : phone,
        clientEmail: matchedClientId || !clientEmail ? undefined : clientEmail,
        notes: notes.trim() || null,
      });

      if (!res.ok) {
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        if (!res.fieldErrors || Object.keys(res.fieldErrors).length === 0) {
          setGeneric(res.error);
        }
        return;
      }
      onSuccess();
    });
  }

  const endsAtPreview = (() => {
    if (!selectedService) return null;
    const [hh, mm] = time.split(':').map(Number);
    const startMin = (hh ?? 0) * 60 + (mm ?? 0);
    const endMin = startMin + selectedService.durationMinutes;
    const eh = String(Math.floor(endMin / 60)).padStart(2, '0');
    const em = String(endMin % 60).padStart(2, '0');
    return `${eh}:${em}`;
  })();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="flex flex-col gap-4"
    >
      <section className="flex flex-col gap-2">
        <Label htmlFor="phone">Cliente — telefone *</Label>
        <Input
          id="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(11) 98765-4321"
          autoComplete="off"
          required
        />
        {matchedClientId ? (
          <p
            className="text-xs"
            style={{ color: 'var(--color-success)' }}
          >
            ✓ Cliente existente: {clientName}
          </p>
        ) : phone && normalizePhoneBR(phone) ? (
          <div className="flex flex-col gap-2">
            <p
              className="text-xs"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Novo cliente — preencha o nome
            </p>
            <Input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Nome completo"
              required
            />
            <Input
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="Email (opcional)"
            />
          </div>
        ) : null}
        {fieldErrors.clientPhone && (
          <p role="alert" className="text-xs [color:var(--color-error)]">
            {fieldErrors.clientPhone}
          </p>
        )}
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <section className="flex flex-col gap-2">
          <Label htmlFor="service">Serviço *</Label>
          <Select
            id="service"
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            required
          >
            <option value="" disabled>
              Selecione
            </option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.durationMinutes}min · R$ {s.priceBrl.toFixed(2).replace('.', ',')}
              </option>
            ))}
          </Select>
        </section>

        <section className="flex flex-col gap-2">
          <Label htmlFor="professional">Profissional *</Label>
          <Select
            id="professional"
            value={professionalId}
            onChange={(e) => setProfessionalId(e.target.value)}
            required
          >
            <option value="" disabled>
              Selecione
            </option>
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </section>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <section className="flex flex-col gap-2">
          <Label htmlFor="date">Data *</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </section>
        <section className="flex flex-col gap-2">
          <Label htmlFor="time">Hora *</Label>
          <Select
            id="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </Select>
          {endsAtPreview && (
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Termina às {endsAtPreview}
            </p>
          )}
        </section>
      </div>

      <section className="flex flex-col gap-2">
        <Label htmlFor="notes">Observações</Label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Ex.: alergia, preferência, cor desejada"
          className="rounded-[var(--radius-md)] border px-3 py-2 text-sm [border-color:var(--color-border-strong)]"
        />
      </section>

      {generic && (
        <div
          role="alert"
          className="rounded-[var(--radius-md)] px-3 py-2 text-sm"
          style={{
            backgroundColor: 'var(--color-error-bg)',
            color: 'var(--color-error)',
          }}
        >
          {generic}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? 'Criando...' : 'Criar agendamento'}
        </Button>
      </div>
    </form>
  );
}

// Keep formatPhoneBR import used (avoids lint warning if we remove it later).
const _formatPhoneBR = formatPhoneBR;
void _formatPhoneBR;
