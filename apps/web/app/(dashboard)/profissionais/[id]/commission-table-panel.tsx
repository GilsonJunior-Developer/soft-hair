'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  bulkSetProfessionalServiceCommissions,
  setCommissionTableEntry,
} from '../actions';

type ServiceRow = {
  id: string;
  name: string;
  category: string;
  commission_override_percent: number | null;
};

type EntryRow = {
  service_id: string;
  percent: number;
};

type Props = {
  professionalId: string;
  professionalDefaultPercent: number;
  services: ServiceRow[];
  entries: EntryRow[];
};

type RowSource = 'TABLE_ENTRY' | 'SERVICE_OVERRIDE' | 'PROFESSIONAL_DEFAULT';

type RowState = {
  service: ServiceRow;
  entryPercent: number | null;
  /** What's effectively applied right now (for the indicator column) */
  resolvedPercent: number;
  resolvedSource: RowSource;
};

function resolveRowSource(
  service: ServiceRow,
  entryPercent: number | null,
  professionalDefaultPercent: number,
): { resolvedPercent: number; resolvedSource: RowSource } {
  if (entryPercent !== null) {
    return { resolvedPercent: entryPercent, resolvedSource: 'TABLE_ENTRY' };
  }
  if (service.commission_override_percent !== null) {
    return {
      resolvedPercent: Number(service.commission_override_percent),
      resolvedSource: 'SERVICE_OVERRIDE',
    };
  }
  return {
    resolvedPercent: professionalDefaultPercent,
    resolvedSource: 'PROFESSIONAL_DEFAULT',
  };
}

const SOURCE_LABEL: Record<RowSource, string> = {
  TABLE_ENTRY: 'Entry',
  SERVICE_OVERRIDE: 'Override do serviço',
  PROFESSIONAL_DEFAULT: 'Default',
};

export function CommissionTablePanel({
  professionalId,
  professionalDefaultPercent,
  services,
  entries,
}: Props) {
  const initialRows = useMemo<RowState[]>(() => {
    const entryMap = new Map(entries.map((e) => [e.service_id, Number(e.percent)]));
    return services.map((service) => {
      const entryPercent = entryMap.get(service.id) ?? null;
      const { resolvedPercent, resolvedSource } = resolveRowSource(
        service,
        entryPercent,
        professionalDefaultPercent,
      );
      return { service, entryPercent, resolvedPercent, resolvedSource };
    });
  }, [services, entries, professionalDefaultPercent]);

  const [rows, setRows] = useState<RowState[]>(initialRows);
  const [expanded, setExpanded] = useState(false);
  const [bulkPercent, setBulkPercent] = useState<string>('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const entriesCount = rows.filter((r) => r.entryPercent !== null).length;
  const fallbackCount = rows.length - entriesCount;

  function refreshRow(serviceId: string, newEntryPercent: number | null) {
    setRows((current) =>
      current.map((row) => {
        if (row.service.id !== serviceId) return row;
        const { resolvedPercent, resolvedSource } = resolveRowSource(
          row.service,
          newEntryPercent,
          professionalDefaultPercent,
        );
        return {
          ...row,
          entryPercent: newEntryPercent,
          resolvedPercent,
          resolvedSource,
        };
      }),
    );
  }

  function handleBlur(row: RowState, raw: string) {
    const trimmed = raw.trim();
    const newEntryPercent = trimmed === '' ? null : Number(trimmed);

    if (newEntryPercent !== null && Number.isNaN(newEntryPercent)) {
      setFeedback('Valor inválido — use apenas números.');
      return;
    }
    if (
      newEntryPercent !== null &&
      (newEntryPercent < 0 || newEntryPercent > 100)
    ) {
      setFeedback('Percentual deve estar entre 0 e 100.');
      return;
    }
    if (newEntryPercent === row.entryPercent) return; // no change

    startTransition(async () => {
      const result = await setCommissionTableEntry(
        professionalId,
        row.service.id,
        newEntryPercent,
      );
      if (!result.ok) {
        setFeedback(result.error);
      } else {
        refreshRow(row.service.id, newEntryPercent);
        setFeedback(
          newEntryPercent === null
            ? `${row.service.name}: regra removida (volta ao fallback).`
            : `${row.service.name}: ${newEntryPercent}% aplicado.`,
        );
      }
    });
  }

  function handleBulkApply() {
    const value = Number(bulkPercent);
    if (Number.isNaN(value) || value < 0 || value > 100) {
      setFeedback('Informe um percentual válido entre 0 e 100.');
      return;
    }

    startTransition(async () => {
      const result = await bulkSetProfessionalServiceCommissions(
        professionalId,
        value,
        { onlyEmpty: true },
      );
      if (!result.ok) {
        setFeedback(result.error);
        return;
      }
      // Update local rows for services that didn't have an entry
      setRows((current) =>
        current.map((row) => {
          if (row.entryPercent !== null) return row; // skip existing
          const { resolvedPercent, resolvedSource } = resolveRowSource(
            row.service,
            value,
            professionalDefaultPercent,
          );
          return {
            ...row,
            entryPercent: value,
            resolvedPercent,
            resolvedSource,
          };
        }),
      );
      setBulkPercent('');
      setFeedback(
        `${result.data.inserted} serviço(s) recebeu(ram) ${value}% (linhas vazias preenchidas).`,
      );
    });
  }

  return (
    <section
      className="flex flex-col gap-3 rounded-[var(--radius-lg)] border p-4"
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--color-surface)',
      }}
      data-testid="commission-table-panel"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2
            className="text-base font-semibold"
            style={{ color: 'var(--color-text-strong)' }}
          >
            Regra por serviço
          </h2>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {entriesCount} serviço(s) com override · {fallbackCount} usando
            fallback (override do serviço ou default do profissional)
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((s) => !s)}
          className="rounded-[var(--radius-md)] border px-3 py-1.5 text-xs"
          style={{
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-strong)',
          }}
          data-testid="toggle-commission-table"
        >
          {expanded ? 'Recolher' : 'Configurar tabela'}
        </button>
      </header>

      {expanded && (
        <>
          <div
            className="flex flex-wrap items-end gap-2 rounded-[var(--radius-md)] border p-3 text-xs"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-bg)',
            }}
          >
            <label className="flex flex-col gap-1">
              <span style={{ color: 'var(--color-text-muted)' }}>
                Aplicar a todos (linhas vazias)
              </span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={bulkPercent}
                onChange={(e) => setBulkPercent(e.target.value)}
                placeholder="ex.: 50"
                className="w-28 rounded-[var(--radius-sm)] border px-2 py-1"
                style={{ borderColor: 'var(--color-border)' }}
                data-testid="bulk-percent-input"
              />
            </label>
            <button
              type="button"
              onClick={handleBulkApply}
              disabled={isPending || bulkPercent === ''}
              className="rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-medium disabled:opacity-50"
              style={{
                backgroundColor: 'var(--color-accent-600)',
                color: 'var(--color-on-accent)',
              }}
              data-testid="bulk-apply-button"
            >
              Aplicar
            </button>
          </div>

          <table
            className="w-full text-sm"
            data-testid="commission-table-grid"
          >
            <thead>
              <tr
                className="text-left text-xs uppercase tracking-wide"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <th className="pb-2 font-medium">Serviço</th>
                <th className="pb-2 font-medium">% profissional</th>
                <th className="pb-2 font-medium">% salão</th>
                <th className="pb-2 font-medium">Resolução</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {rows.map((row) => (
                <CommissionRow
                  key={row.service.id}
                  row={row}
                  onBlur={(raw) => handleBlur(row, raw)}
                  disabled={isPending}
                />
              ))}
            </tbody>
          </table>
        </>
      )}

      {feedback && (
        <p
          aria-live="polite"
          className="text-xs"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {feedback}
        </p>
      )}
    </section>
  );
}

function CommissionRow({
  row,
  onBlur,
  disabled,
}: {
  row: RowState;
  onBlur: (raw: string) => void;
  disabled: boolean;
}) {
  const [draft, setDraft] = useState(
    row.entryPercent === null ? '' : String(row.entryPercent),
  );

  const salonShare = (100 - row.resolvedPercent).toFixed(2);

  return (
    <tr>
      <td className="py-2 pr-2">
        <div className="flex flex-col">
          <span style={{ color: 'var(--color-text-strong)' }}>
            {row.service.name}
          </span>
          <span
            className="text-xs"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {row.service.category}
          </span>
        </div>
      </td>
      <td className="py-2 pr-2">
        <input
          type="number"
          min="0"
          max="100"
          step="0.5"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => onBlur(e.target.value)}
          placeholder="—"
          disabled={disabled}
          className="w-24 rounded-[var(--radius-sm)] border px-2 py-1 text-sm"
          style={{ borderColor: 'var(--color-border)' }}
          data-testid={`commission-input-${row.service.id}`}
          aria-label={`Comissão do profissional para ${row.service.name}`}
        />
      </td>
      <td className="py-2 pr-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
        {salonShare}%
      </td>
      <td className="py-2 pr-2 text-xs">
        <span
          className="inline-flex items-center rounded-full px-2 py-0.5"
          style={{
            backgroundColor:
              row.resolvedSource === 'TABLE_ENTRY'
                ? 'var(--color-accent-100)'
                : 'var(--color-bg)',
            color:
              row.resolvedSource === 'TABLE_ENTRY'
                ? 'var(--color-accent-700)'
                : 'var(--color-text-muted)',
          }}
        >
          {SOURCE_LABEL[row.resolvedSource]} · {row.resolvedPercent}%
        </span>
      </td>
    </tr>
  );
}
