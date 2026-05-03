'use client';

import { useMemo, useState } from 'react';
import { calculateCommission } from '@/lib/commission/calculate';
import { resolveRate } from '@/lib/commission/resolve-rate';
import type { CommissionMode } from '@/lib/commission/types';
import { formatBrl } from '@/lib/format';

type Professional = {
  id: string;
  name: string;
  commissionMode: CommissionMode;
  commissionDefaultPercent: number;
};

type Service = {
  id: string;
  name: string;
  category: string;
  priceBrl: number;
  commissionOverridePercent: number | null;
};

type TableEntry = {
  professionalId: string;
  serviceId: string;
  percent: number;
};

type Props = {
  professionals: Professional[];
  services: Service[];
  entries: TableEntry[];
};

const SOURCE_LABEL: Record<string, string> = {
  TABLE_ENTRY: 'tabela do profissional',
  SERVICE_OVERRIDE: 'override do serviço',
  PROFESSIONAL_DEFAULT: 'default do profissional',
};

export function CommissionSimulator({
  professionals,
  services,
  entries,
}: Props) {
  const [professionalId, setProfessionalId] = useState(
    professionals[0]?.id ?? '',
  );
  const [serviceId, setServiceId] = useState(services[0]?.id ?? '');
  const [quantity, setQuantity] = useState(1);
  const [unitPriceRaw, setUnitPriceRaw] = useState<string>(
    services[0] ? String(services[0].priceBrl) : '0',
  );

  const professional = useMemo(
    () => professionals.find((p) => p.id === professionalId) ?? null,
    [professionals, professionalId],
  );
  const service = useMemo(
    () => services.find((s) => s.id === serviceId) ?? null,
    [services, serviceId],
  );

  // Sync unitPrice when service changes (only on selection change)
  function handleServiceChange(newId: string) {
    setServiceId(newId);
    const svc = services.find((s) => s.id === newId);
    if (svc) setUnitPriceRaw(String(svc.priceBrl));
  }

  const unitPrice = Number(unitPriceRaw);
  const validInputs =
    professional !== null &&
    service !== null &&
    !Number.isNaN(unitPrice) &&
    unitPrice >= 0 &&
    quantity >= 1;

  const result = useMemo(() => {
    if (!validInputs || !professional || !service) return null;

    const tableEntry =
      entries.find(
        (e) =>
          e.professionalId === professional.id && e.serviceId === service.id,
      ) ?? null;

    const { percentApplied, source } = resolveRate({
      professional: {
        commissionMode: professional.commissionMode,
        commissionDefaultPercent: professional.commissionDefaultPercent,
      },
      service: {
        commissionOverridePercent: service.commissionOverridePercent,
      },
      tableEntry: tableEntry ? { percent: tableEntry.percent } : null,
    });

    const { commissionAmountBrl: perUnit } = calculateCommission({
      servicePriceBrl: unitPrice,
      percentApplied,
    });

    const totalCommission = perUnit * quantity;
    const totalRevenue = unitPrice * quantity;
    const salonShare = totalRevenue - totalCommission;

    return {
      percentApplied,
      source,
      perUnit,
      totalCommission,
      totalRevenue,
      salonShare,
    };
  }, [validInputs, professional, service, entries, unitPrice, quantity]);

  if (professionals.length === 0 || services.length === 0) {
    return (
      <div
        className="rounded-[var(--radius-lg)] border p-6 text-sm"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-text-muted)',
        }}
      >
        Cadastre ao menos 1 profissional e 1 serviço para usar o simulador.
      </div>
    );
  }

  return (
    <div
      className="grid gap-4 md:grid-cols-[1fr_minmax(280px,1fr)]"
      data-testid="commission-simulator"
    >
      <section
        className="flex flex-col gap-3 rounded-[var(--radius-lg)] border p-4"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-surface)',
        }}
      >
        <h2
          className="text-sm font-semibold"
          style={{ color: 'var(--color-text-strong)' }}
        >
          Cenário
        </h2>

        <label className="flex flex-col gap-1 text-xs">
          <span style={{ color: 'var(--color-text-muted)' }}>Profissional</span>
          <select
            value={professionalId}
            onChange={(e) => setProfessionalId(e.target.value)}
            className="rounded-[var(--radius-md)] border px-2 py-1.5 text-sm"
            style={{ borderColor: 'var(--color-border)' }}
            data-testid="simulator-professional"
          >
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.commissionMode === 'TABLE' ? 'tabela' : 'fixa'})
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs">
          <span style={{ color: 'var(--color-text-muted)' }}>Serviço</span>
          <select
            value={serviceId}
            onChange={(e) => handleServiceChange(e.target.value)}
            className="rounded-[var(--radius-md)] border px-2 py-1.5 text-sm"
            style={{ borderColor: 'var(--color-border)' }}
            data-testid="simulator-service"
          >
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.category} — {s.name} (R$ {s.priceBrl.toFixed(2)})
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs">
            <span style={{ color: 'var(--color-text-muted)' }}>Quantidade</span>
            <input
              type="number"
              min="1"
              max="100"
              value={quantity}
              onChange={(e) =>
                setQuantity(Math.max(1, Math.min(100, Number(e.target.value))))
              }
              className="rounded-[var(--radius-md)] border px-2 py-1.5 text-sm"
              style={{ borderColor: 'var(--color-border)' }}
              data-testid="simulator-quantity"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span style={{ color: 'var(--color-text-muted)' }}>
              Preço unitário (R$)
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={unitPriceRaw}
              onChange={(e) => setUnitPriceRaw(e.target.value)}
              className="rounded-[var(--radius-md)] border px-2 py-1.5 text-sm"
              style={{ borderColor: 'var(--color-border)' }}
              data-testid="simulator-unit-price"
            />
          </label>
        </div>
      </section>

      <section
        className="flex flex-col gap-3 rounded-[var(--radius-lg)] border p-4"
        style={{
          borderColor: 'var(--color-accent-200)',
          backgroundColor: 'var(--color-accent-50)',
        }}
      >
        <h2
          className="text-sm font-semibold"
          style={{ color: 'var(--color-accent-700)' }}
        >
          Resultado
        </h2>

        {result === null ? (
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Preencha o cenário ao lado.
          </p>
        ) : (
          <div
            className="flex flex-col gap-2 text-sm"
            data-testid="simulator-result"
          >
            <p
              className="leading-relaxed"
              style={{ color: 'var(--color-text-strong)' }}
            >
              Se você fizer{' '}
              <strong>
                {quantity} {service?.name}
              </strong>{' '}
              a <strong>{formatBrl(unitPrice)}</strong>,{' '}
              <strong>{professional?.name}</strong> ganha{' '}
              <strong data-testid="simulator-commission">
                {formatBrl(result.totalCommission)}
              </strong>{' '}
              (e o salão{' '}
              <strong>{formatBrl(result.salonShare)}</strong>).
            </p>
            <dl
              className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <dt>Faturamento total:</dt>
              <dd>{formatBrl(result.totalRevenue)}</dd>
              <dt>Comissão por unidade:</dt>
              <dd>{formatBrl(result.perUnit)}</dd>
              <dt>Percentual aplicado:</dt>
              <dd data-testid="simulator-percent">{result.percentApplied}%</dd>
              <dt>Fonte da regra:</dt>
              <dd data-testid="simulator-source">
                {SOURCE_LABEL[result.source] ?? result.source}
              </dd>
            </dl>
          </div>
        )}
      </section>
    </div>
  );
}
