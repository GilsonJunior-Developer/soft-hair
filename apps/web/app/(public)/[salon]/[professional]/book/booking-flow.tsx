'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  useTransition,
  type FormEvent,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { normalizePhoneBR } from '@/lib/phone';
import { LGPD_CONSENT_COPY } from '@/lib/booking/consent';
import { computeAvailability, createBooking } from './actions';

export type BookingService = {
  id: string;
  name: string;
  category: string;
  duration_minutes: number;
  price_brl: number;
};

type Step = 'service' | 'datetime' | 'contact';

const SAO_PAULO_TZ = 'America/Sao_Paulo';

type Props = {
  salonSlug: string;
  salonName: string;
  professionalSlug: string;
  professionalName: string;
  services: BookingService[];
  preselectedServiceId: string | null;
};

export function BookingFlow({
  salonSlug,
  salonName,
  professionalSlug,
  professionalName,
  services,
  preselectedServiceId,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>(
    preselectedServiceId ? 'datetime' : 'service',
  );
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(
    preselectedServiceId,
  );
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const selectedService = useMemo(
    () => services.find((s) => s.id === selectedServiceId) ?? null,
    [services, selectedServiceId],
  );

  const pickService = useCallback(
    (serviceId: string) => {
      setSelectedServiceId(serviceId);
      setSelectedSlot(null);
      const params = new URLSearchParams(searchParams.toString());
      params.set('s', serviceId);
      router.replace(`?${params.toString()}`, { scroll: false });
      setStep('datetime');
    },
    [router, searchParams],
  );

  return (
    <div className="flex flex-col gap-6">
      <StepIndicator step={step} />

      {step === 'service' && (
        <ServiceStep services={services} onPick={pickService} />
      )}

      {step === 'datetime' && selectedService && (
        <DateTimeStep
          salonSlug={salonSlug}
          professionalSlug={professionalSlug}
          service={selectedService}
          onBack={() => setStep('service')}
          onPick={(slot) => {
            setSelectedSlot(slot);
            setStep('contact');
          }}
        />
      )}

      {step === 'contact' && selectedService && selectedSlot && (
        <ContactStep
          salonSlug={salonSlug}
          salonName={salonName}
          professionalSlug={professionalSlug}
          professionalName={professionalName}
          service={selectedService}
          slot={selectedSlot}
          onBack={() => setStep('datetime')}
        />
      )}
    </div>
  );
}

/* ============================================================
 * Step indicator
 * ============================================================*/

function StepIndicator({ step }: { step: Step }) {
  const labels: Array<{ key: Step; label: string }> = [
    { key: 'service', label: 'Serviço' },
    { key: 'datetime', label: 'Horário' },
    { key: 'contact', label: 'Confirmar' },
  ];
  const activeIdx = labels.findIndex((l) => l.key === step);

  return (
    <ol
      className="flex items-center gap-2"
      aria-label="Etapas do agendamento"
    >
      {labels.map((l, i) => {
        const isActive = i === activeIdx;
        const isDone = i < activeIdx;
        return (
          <li key={l.key} className="flex flex-1 items-center gap-2">
            <span
              aria-current={isActive ? 'step' : undefined}
              className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold"
              style={{
                backgroundColor: isActive || isDone
                  ? 'var(--color-accent-600)'
                  : 'var(--color-surface)',
                color: isActive || isDone ? 'white' : 'var(--color-text-muted)',
                borderWidth: 1,
                borderColor: 'var(--color-border)',
              }}
            >
              {isDone ? '✓' : i + 1}
            </span>
            <span
              className="text-xs font-medium"
              style={{
                color: isActive
                  ? 'var(--color-text-strong)'
                  : 'var(--color-text-muted)',
              }}
            >
              {l.label}
            </span>
            {i < labels.length - 1 && (
              <span
                aria-hidden="true"
                className="mx-1 h-px flex-1"
                style={{ backgroundColor: 'var(--color-border)' }}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/* ============================================================
 * Step 1 — Service selection
 * ============================================================*/

function ServiceStep({
  services,
  onPick,
}: {
  services: BookingService[];
  onPick: (id: string) => void;
}) {
  if (services.length === 0) {
    return (
      <EmptyCard>
        Nenhum serviço disponível para este profissional no momento.
      </EmptyCard>
    );
  }

  return (
    <section aria-labelledby="service-heading" className="flex flex-col gap-3">
      <h2 id="service-heading" className="text-base font-semibold">
        Escolha o serviço
      </h2>
      <ul className="flex flex-col gap-2">
        {services.map((service) => (
          <li key={service.id}>
            <button
              type="button"
              onClick={() => onPick(service.id)}
              className="flex w-full items-center justify-between gap-4 rounded-[var(--radius-lg)] border p-4 text-left transition-colors hover:[background-color:var(--color-surface-hover)] focus-visible:outline-none focus-visible:ring-2"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                minHeight: 60,
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
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ============================================================
 * Step 2 — Date & time
 * ============================================================*/

function DateTimeStep({
  salonSlug,
  professionalSlug,
  service,
  onBack,
  onPick,
}: {
  salonSlug: string;
  professionalSlug: string;
  service: BookingService;
  onBack: () => void;
  onPick: (iso: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + 14);

    computeAvailability({
      salonSlug,
      professionalSlug,
      serviceId: service.id,
      from: from.toISOString(),
      to: to.toISOString(),
    }).then((res) => {
      if (cancelled) return;
      if (!res.ok) {
        setError(res.error);
        setSlots([]);
      } else {
        setSlots(res.data.slots);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [salonSlug, professionalSlug, service.id]);

  const slotsByDay = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const iso of slots) {
      const key = dayKey(iso);
      const existing = map.get(key);
      if (existing) existing.push(iso);
      else map.set(key, [iso]);
    }
    return map;
  }, [slots]);

  const dayList = useMemo(() => buildDayList(14), []);

  useEffect(() => {
    if (selectedDayKey) return;
    const firstWithSlots = dayList.find((d) => slotsByDay.has(d.key));
    if (firstWithSlots) setSelectedDayKey(firstWithSlots.key);
  }, [dayList, slotsByDay, selectedDayKey]);

  const activeSlots = selectedDayKey
    ? slotsByDay.get(selectedDayKey) ?? []
    : [];

  return (
    <section aria-labelledby="datetime-heading" className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 id="datetime-heading" className="text-base font-semibold">
          Escolha data e horário
        </h2>
        <Button variant="ghost" size="sm" onClick={onBack} type="button">
          ← Trocar serviço
        </Button>
      </div>

      <p
        className="text-sm"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {service.name} · {service.duration_minutes} min · R${' '}
        {formatPriceBrl(service.price_brl)}
      </p>

      {loading ? (
        <SlotSkeleton />
      ) : error ? (
        <EmptyCard tone="error">{error}</EmptyCard>
      ) : slots.length === 0 ? (
        <EmptyCard>
          Sem horários disponíveis nos próximos 14 dias. Entre em contato com o
          salão diretamente.
        </EmptyCard>
      ) : (
        <>
          <DayStrip
            days={dayList}
            slotsByDay={slotsByDay}
            selectedKey={selectedDayKey}
            onSelect={setSelectedDayKey}
          />
          <SlotGrid slots={activeSlots} onPick={onPick} />
        </>
      )}
    </section>
  );
}

function SlotSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Carregando horários"
      className="flex flex-col gap-3"
    >
      <div
        className="h-12 rounded-[var(--radius-md)]"
        style={{ backgroundColor: 'var(--color-surface-hover)' }}
      />
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="h-12 rounded-[var(--radius-md)]"
            style={{ backgroundColor: 'var(--color-surface-hover)' }}
          />
        ))}
      </div>
    </div>
  );
}

function DayStrip({
  days,
  slotsByDay,
  selectedKey,
  onSelect,
}: {
  days: Array<{ key: string; date: Date }>;
  slotsByDay: Map<string, string[]>;
  selectedKey: string | null;
  onSelect: (key: string) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Dias"
      className="flex gap-2 overflow-x-auto pb-1"
      style={{ scrollbarWidth: 'thin' }}
    >
      {days.map((d) => {
        const isSelected = d.key === selectedKey;
        const hasSlots = slotsByDay.has(d.key);
        return (
          <button
            key={d.key}
            role="tab"
            type="button"
            aria-selected={isSelected}
            disabled={!hasSlots}
            onClick={() => onSelect(d.key)}
            className="flex min-w-[60px] flex-col items-center justify-center rounded-[var(--radius-md)] border px-3 py-2 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              borderColor: isSelected
                ? 'var(--color-accent-600)'
                : 'var(--color-border)',
              backgroundColor: isSelected
                ? 'var(--color-accent-50)'
                : 'var(--color-surface)',
              color: isSelected
                ? 'var(--color-accent-700)'
                : 'var(--color-text-base)',
              minHeight: 52,
            }}
          >
            <span className="font-medium uppercase">{weekdayShort(d.date)}</span>
            <span className="text-base font-semibold">{d.date.getDate()}</span>
          </button>
        );
      })}
    </div>
  );
}

function SlotGrid({
  slots,
  onPick,
}: {
  slots: string[];
  onPick: (iso: string) => void;
}) {
  if (slots.length === 0) {
    return (
      <EmptyCard>
        Sem horários neste dia. Escolha outra data acima.
      </EmptyCard>
    );
  }

  return (
    <ul
      className="grid grid-cols-4 gap-2 sm:grid-cols-5"
      aria-label="Horários disponíveis"
    >
      {slots.map((iso) => (
        <li key={iso}>
          <button
            type="button"
            onClick={() => onPick(iso)}
            className="flex h-11 w-full items-center justify-center rounded-[var(--radius-md)] border text-sm font-medium transition-colors hover:[background-color:var(--color-accent-50)] focus-visible:outline-none focus-visible:ring-2"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-strong)',
            }}
          >
            {formatTime(iso)}
          </button>
        </li>
      ))}
    </ul>
  );
}

/* ============================================================
 * Step 3 — Contact & consent
 * ============================================================*/

function ContactStep({
  salonSlug,
  salonName,
  professionalSlug,
  professionalName,
  service,
  slot,
  onBack,
}: {
  salonSlug: string;
  salonName: string;
  professionalSlug: string;
  professionalName: string;
  service: BookingService;
  slot: string;
  onBack: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const nameId = useId();
  const emailId = useId();
  const phoneId = useId();
  const consentId = useId();
  const errorId = useId();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setFormError(null);

    const nextErrors: Record<string, string> = {};
    if (name.trim().length < 2) {
      nextErrors.clientName = 'Informe seu nome completo';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      nextErrors.clientEmail = 'Email inválido';
    }
    if (!normalizePhoneBR(phone)) {
      nextErrors.clientPhone = 'Use o formato (11) 9xxxx-xxxx';
    }
    if (!consent) {
      nextErrors.lgpdConsent = 'É necessário aceitar para continuar';
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setFormError('Revise os campos destacados');
      return;
    }

    startTransition(async () => {
      const res = await createBooking({
        salonSlug,
        professionalSlug,
        serviceId: service.id,
        scheduledAt: slot,
        clientName: name.trim(),
        clientEmail: email.trim(),
        clientPhone: phone,
        lgpdConsent: consent,
      });
      if (!res.ok) {
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        setFormError(res.error);
        return;
      }
      const { appointmentId, cancelToken, emailDelivered } = res.data;
      const params = new URLSearchParams({ t: cancelToken });
      if (!emailDelivered) params.set('email', 'pending');
      router.push(
        `/${salonSlug}/${professionalSlug}/book/success/${appointmentId}?${params.toString()}`,
      );
    });
  };

  return (
    <section aria-labelledby="contact-heading" className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 id="contact-heading" className="text-base font-semibold">
          Seus dados
        </h2>
        <Button variant="ghost" size="sm" onClick={onBack} type="button">
          ← Trocar horário
        </Button>
      </div>

      <div
        className="flex flex-col gap-1 rounded-[var(--radius-md)] border p-3 text-sm"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-text-muted)',
        }}
      >
        <span>
          <strong style={{ color: 'var(--color-text-strong)' }}>
            {service.name}
          </strong>{' '}
          · {service.duration_minutes} min · R${' '}
          {formatPriceBrl(service.price_brl)}
        </span>
        <span>
          {formatFullDateTime(slot)} com {professionalName} no {salonName}
        </span>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        aria-describedby={formError ? errorId : undefined}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={nameId}>Nome completo</Label>
          <Input
            id={nameId}
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={!!fieldErrors.clientName}
            aria-describedby={
              fieldErrors.clientName ? `${nameId}-error` : undefined
            }
          />
          {fieldErrors.clientName && (
            <p
              id={`${nameId}-error`}
              className="text-xs"
              style={{ color: 'var(--color-error)' }}
            >
              {fieldErrors.clientName}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={emailId}>Email</Label>
          <Input
            id={emailId}
            type="email"
            autoComplete="email"
            required
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!fieldErrors.clientEmail}
            aria-describedby={
              fieldErrors.clientEmail
                ? `${emailId}-error`
                : `${emailId}-hint`
            }
          />
          <p
            id={`${emailId}-hint`}
            className="text-xs"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Enviaremos a confirmação para este endereço.
          </p>
          {fieldErrors.clientEmail && (
            <p
              id={`${emailId}-error`}
              className="text-xs"
              style={{ color: 'var(--color-error)' }}
            >
              {fieldErrors.clientEmail}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={phoneId}>Telefone (WhatsApp)</Label>
          <Input
            id={phoneId}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            required
            placeholder="(11) 98765-4321"
            value={phone}
            onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
            aria-invalid={!!fieldErrors.clientPhone}
            aria-describedby={
              fieldErrors.clientPhone ? `${phoneId}-error` : undefined
            }
          />
          {fieldErrors.clientPhone && (
            <p
              id={`${phoneId}-error`}
              className="text-xs"
              style={{ color: 'var(--color-error)' }}
            >
              {fieldErrors.clientPhone}
            </p>
          )}
        </div>

        <div className="flex items-start gap-2">
          <input
            id={consentId}
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            aria-invalid={!!fieldErrors.lgpdConsent}
            aria-describedby={
              fieldErrors.lgpdConsent ? `${consentId}-error` : undefined
            }
            className="mt-1 h-4 w-4"
            required
          />
          <label htmlFor={consentId} className="text-sm leading-snug">
            {LGPD_CONSENT_COPY}.
          </label>
        </div>
        {fieldErrors.lgpdConsent && (
          <p
            id={`${consentId}-error`}
            className="-mt-2 text-xs"
            style={{ color: 'var(--color-error)' }}
          >
            {fieldErrors.lgpdConsent}
          </p>
        )}

        <div aria-live="polite" role="status" className="min-h-[1.25rem]">
          {formError && (
            <p
              id={errorId}
              className="text-sm"
              style={{ color: 'var(--color-error)' }}
            >
              {formError}
            </p>
          )}
        </div>

        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? 'Confirmando…' : 'Confirmar agendamento'}
        </Button>
      </form>
    </section>
  );
}

/* ============================================================
 * Presentational helpers
 * ============================================================*/

function EmptyCard({
  children,
  tone = 'muted',
}: {
  children: React.ReactNode;
  tone?: 'muted' | 'error';
}) {
  return (
    <div
      className="rounded-[var(--radius-lg)] border p-6 text-center text-sm"
      role={tone === 'error' ? 'alert' : undefined}
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        color:
          tone === 'error' ? 'var(--color-error)' : 'var(--color-text-muted)',
      }}
    >
      {children}
    </div>
  );
}

/* ============================================================
 * Pure helpers (formatting + phone mask + day calendar)
 * ============================================================*/

function formatPriceBrl(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

const dayKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: SAO_PAULO_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const weekdayFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: SAO_PAULO_TZ,
  weekday: 'short',
});

const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: SAO_PAULO_TZ,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const fullDateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: SAO_PAULO_TZ,
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function dayKey(iso: string): string {
  return dayKeyFormatter.format(new Date(iso));
}

function weekdayShort(d: Date): string {
  return weekdayFormatter.format(d).replace('.', '');
}

function formatTime(iso: string): string {
  return timeFormatter.format(new Date(iso));
}

function formatFullDateTime(iso: string): string {
  return fullDateTimeFormatter.format(new Date(iso));
}

function buildDayList(count: number): Array<{ key: string; date: Date }> {
  const list: Array<{ key: string; date: Date }> = [];
  const base = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    list.push({ key: dayKeyFormatter.format(d), date: d });
  }
  return list;
}

function formatPhoneInput(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

