'use client';

import {
  useCallback,
  useId,
  useMemo,
  useState,
  useTransition,
  type FormEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronRight, Download, Printer } from 'lucide-react';
import { addMonths, startOfMonth, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';
import { BR_TIMEZONE } from '@/lib/agenda/date-range';
import { formatBrl } from '@/lib/format';
import { fetchCommissionReportRows } from './actions';
import { formatCommissionCsv, buildCsvFilename, type CsvInputRow } from './csv';
import { formatYyyyMmDdSp } from './period';
import type {
  CommissionReportSummary,
  CommissionRow,
  ProfessionalAggregate,
} from './types';

type Props = {
  initialSummary: CommissionReportSummary;
  fromYyyyMmDd: string;
  toYyyyMmDd: string;
  salonSlug: string;
};

type DrilldownState = {
  status: 'idle' | 'loading' | 'loaded' | 'error';
  rows: CommissionRow[];
  error: string | null;
};

const EMPTY_DRILLDOWN: DrilldownState = {
  status: 'idle',
  rows: [],
  error: null,
};

export function CommissionReportClient({
  initialSummary,
  fromYyyyMmDd,
  toYyyyMmDd,
  salonSlug,
}: Props) {
  const router = useRouter();
  const [isFiltering, startFilterTransition] = useTransition();

  const [drilldowns, setDrilldowns] = useState<Record<string, DrilldownState>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [fromInput, setFromInput] = useState(fromYyyyMmDd);
  const [toInput, setToInput] = useState(toYyyyMmDd);

  const headingId = useId();

  const periodLabel = useMemo(
    () =>
      `${formatPtBr(fromYyyyMmDd)} a ${formatPtBr(subDayLabel(toYyyyMmDd))}`,
    [fromYyyyMmDd, toYyyyMmDd],
  );

  const navigateTo = useCallback(
    (from: string, to: string) => {
      startFilterTransition(() => {
        router.push(`/comissao?from=${from}&to=${to}`);
      });
    },
    [router],
  );

  function handleFilterSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!fromInput || !toInput || fromInput >= toInput) return;
    navigateTo(fromInput, toInput);
  }

  function applyPreset(preset: 'current' | 'previous' | 'last30') {
    const window = computePresetWindow(preset);
    const f = formatYyyyMmDdSp(window.from);
    const t = formatYyyyMmDdSp(window.to);
    setFromInput(f);
    setToInput(t);
    navigateTo(f, t);
  }

  async function toggleExpand(professionalId: string) {
    const isOpen = expanded[professionalId] ?? false;
    setExpanded((prev) => ({ ...prev, [professionalId]: !isOpen }));

    if (isOpen) return; // closing — no fetch
    if (drilldowns[professionalId]?.status === 'loaded') return; // cached
    await loadDrilldown(professionalId);
  }

  async function loadDrilldown(professionalId: string) {
    setDrilldowns((prev) => ({
      ...prev,
      [professionalId]: { status: 'loading', rows: [], error: null },
    }));

    const res = await fetchCommissionReportRows({
      from: initialSummary.fromIso,
      to: initialSummary.toIso,
      professionalId,
    });

    if (!res.ok) {
      setDrilldowns((prev) => ({
        ...prev,
        [professionalId]: { status: 'error', rows: [], error: res.error },
      }));
      return;
    }
    setDrilldowns((prev) => ({
      ...prev,
      [professionalId]: { status: 'loaded', rows: res.data, error: null },
    }));
  }

  async function handleExportCsv() {
    // Fetch all drill-downs in parallel; cached entries short-circuit.
    const drillResults = await Promise.all(
      initialSummary.rows.map(async (agg) => {
        const cached = drilldowns[agg.professionalId];
        if (cached?.status === 'loaded') {
          return {
            professionalId: agg.professionalId,
            professionalName: agg.professionalName,
            rows: cached.rows,
          };
        }
        const res = await fetchCommissionReportRows({
          from: initialSummary.fromIso,
          to: initialSummary.toIso,
          professionalId: agg.professionalId,
        });
        return {
          professionalId: agg.professionalId,
          professionalName: agg.professionalName,
          rows: res.ok ? res.data : [],
        };
      }),
    );

    // Update cache for any newly-fetched (state update is fire-and-forget here;
    // CSV uses the local `drillResults` directly, so the update only benefits
    // future interactions / drill-down re-opens).
    setDrilldowns((prev) => {
      const next = { ...prev };
      for (const { professionalId, rows } of drillResults) {
        if (next[professionalId]?.status !== 'loaded') {
          next[professionalId] = { status: 'loaded', rows, error: null };
        }
      }
      return next;
    });

    const csvRows: CsvInputRow[] = drillResults.flatMap(
      ({ rows, professionalName }) =>
        rows.map((r) => ({ ...r, professionalName })),
    );

    const csv = formatCommissionCsv(csvRows);
    const filename = buildCsvFilename({ salonSlug, fromYyyyMmDd, toYyyyMmDd });
    triggerCsvDownload(csv, filename);
  }

  async function handlePrint() {
    // Expand all rows so print sees full content.
    const allOpen: Record<string, boolean> = {};
    for (const r of initialSummary.rows) {
      allOpen[r.professionalId] = true;
    }
    setExpanded(allOpen);

    // Fetch any missing drill-downs.
    const missing = initialSummary.rows.filter(
      (r) =>
        (drilldowns[r.professionalId]?.status ?? 'idle') !== 'loaded',
    );
    if (missing.length > 0) {
      await Promise.all(
        missing.map((r) => loadDrilldown(r.professionalId)),
      );
    }

    // Yield to React so DOM updates before window.print().
    requestAnimationFrame(() => {
      window.print();
    });
  }

  const isEmpty = initialSummary.rows.length === 0;

  return (
    <section
      className="flex flex-col gap-6"
      data-testid="commission-report"
    >
      {/* Print-only stylesheet: hide chrome, force expanded rows visible. */}
      <PrintStyles />

      <header className="flex flex-col gap-1">
        <h1
          id={headingId}
          className="text-2xl font-semibold [color:var(--color-text-strong)]"
        >
          Comissão
        </h1>
        <p className="text-sm [color:var(--color-text-muted)]">
          Período: <strong>{periodLabel}</strong>
          {' · '}
          {initialSummary.totals.appointments}{' '}
          atendimento{initialSummary.totals.appointments === 1 ? '' : 's'}
          {' · '}Comissão total{' '}
          <strong>{formatBrl(initialSummary.totals.commissionBrl)}</strong>
        </p>
      </header>

      <form
        onSubmit={handleFilterSubmit}
        className="flex flex-wrap items-end gap-3 print:hidden"
        data-testid="commission-filter"
      >
        <div className="flex flex-wrap gap-2">
          <PresetButton onClick={() => applyPreset('current')}>
            Mês corrente
          </PresetButton>
          <PresetButton onClick={() => applyPreset('previous')}>
            Mês anterior
          </PresetButton>
          <PresetButton onClick={() => applyPreset('last30')}>
            Últimos 30 dias
          </PresetButton>
        </div>

        <label className="flex flex-col gap-1 text-xs">
          <span style={{ color: 'var(--color-text-muted)' }}>De</span>
          <input
            type="date"
            value={fromInput}
            onChange={(e) => setFromInput(e.target.value)}
            className="rounded-[var(--radius-md)] border px-2 py-1.5 text-sm"
            style={{ borderColor: 'var(--color-border)' }}
            data-testid="commission-filter-from"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span style={{ color: 'var(--color-text-muted)' }}>Até (exclusivo)</span>
          <input
            type="date"
            value={toInput}
            onChange={(e) => setToInput(e.target.value)}
            className="rounded-[var(--radius-md)] border px-2 py-1.5 text-sm"
            style={{ borderColor: 'var(--color-border)' }}
            data-testid="commission-filter-to"
          />
        </label>
        <button
          type="submit"
          disabled={isFiltering}
          className="h-9 rounded-[var(--radius-md)] px-3 text-sm font-medium disabled:opacity-50"
          style={{
            backgroundColor: 'var(--color-accent-600)',
            color: 'white',
          }}
          data-testid="commission-filter-apply"
        >
          {isFiltering ? 'Filtrando…' : 'Aplicar'}
        </button>

        <div className="ml-auto flex flex-wrap items-end gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isEmpty}
            className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-md)] border px-3 text-sm font-medium disabled:opacity-50"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-strong)',
            }}
            data-testid="commission-export-csv"
          >
            <Download className="h-4 w-4" aria-hidden /> Baixar CSV
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={isEmpty}
            className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-md)] border px-3 text-sm font-medium disabled:opacity-50"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-strong)',
            }}
            data-testid="commission-print"
          >
            <Printer className="h-4 w-4" aria-hidden /> Imprimir / PDF
          </button>
        </div>
      </form>

      {isEmpty ? (
        <EmptyState periodLabel={periodLabel} />
      ) : (
        <AggregateTable
          summary={initialSummary}
          expanded={expanded}
          drilldowns={drilldowns}
          onToggle={toggleExpand}
        />
      )}
    </section>
  );
}

/* ----------------------------------------------------------
 * Aggregate table + drill-down panels
 * ----------------------------------------------------------*/

function AggregateTable({
  summary,
  expanded,
  drilldowns,
  onToggle,
}: {
  summary: CommissionReportSummary;
  expanded: Record<string, boolean>;
  drilldowns: Record<string, DrilldownState>;
  onToggle: (professionalId: string) => void;
}) {
  return (
    <div
      className="overflow-x-auto rounded-[var(--radius-lg)] border"
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--color-surface)',
      }}
    >
      <table className="w-full text-sm" data-testid="commission-aggregate-table">
        <thead>
          <tr style={{ backgroundColor: 'var(--color-surface-hover)' }}>
            <th scope="col" className="w-10" />
            <th scope="col" className="px-3 py-2 text-left">
              Profissional
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              Atendimentos
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              Faturamento
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              Comissão devida
            </th>
          </tr>
        </thead>
        <tbody>
          {summary.rows.map((row) => (
            <ProfessionalRow
              key={row.professionalId}
              row={row}
              isExpanded={expanded[row.professionalId] ?? false}
              drilldown={drilldowns[row.professionalId] ?? EMPTY_DRILLDOWN}
              onToggle={() => onToggle(row.professionalId)}
            />
          ))}
        </tbody>
        <tfoot>
          <tr
            className="border-t font-semibold"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <td className="px-3 py-2 text-right" colSpan={2}>
              TOTAL
            </td>
            <td className="px-3 py-2 text-right">
              {summary.totals.appointments}
            </td>
            <td className="px-3 py-2 text-right">
              {formatBrl(summary.totals.revenueBrl)}
            </td>
            <td className="px-3 py-2 text-right">
              {formatBrl(summary.totals.commissionBrl)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function ProfessionalRow({
  row,
  isExpanded,
  drilldown,
  onToggle,
}: {
  row: ProfessionalAggregate;
  isExpanded: boolean;
  drilldown: DrilldownState;
  onToggle: () => void;
}) {
  const panelId = `commission-drilldown-${row.professionalId}`;
  const labelId = `commission-row-${row.professionalId}`;

  return (
    <>
      <tr
        className="border-t hover:[background-color:var(--color-surface-hover)]"
        style={{ borderColor: 'var(--color-border)' }}
        data-testid={`commission-row-${row.professionalId}`}
      >
        <td className="px-2 py-2">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={isExpanded}
            aria-controls={panelId}
            className="inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-md)] hover:[background-color:var(--color-surface)]"
            data-testid={`commission-toggle-${row.professionalId}`}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" aria-hidden />
            ) : (
              <ChevronRight className="h-4 w-4" aria-hidden />
            )}
            <span className="sr-only">
              {isExpanded ? 'Ocultar atendimentos' : 'Mostrar atendimentos'} de{' '}
              {row.professionalName}
            </span>
          </button>
        </td>
        <td id={labelId} className="px-3 py-2 [color:var(--color-text-strong)]">
          {row.professionalName}
        </td>
        <td className="px-3 py-2 text-right">{row.appointments}</td>
        <td className="px-3 py-2 text-right">{formatBrl(row.revenueBrl)}</td>
        <td className="px-3 py-2 text-right [color:var(--color-text-strong)]">
          <strong>{formatBrl(row.commissionBrl)}</strong>
        </td>
      </tr>
      {isExpanded && (
        <tr id={panelId}>
          <td
            colSpan={5}
            className="px-3 pb-3 pt-1"
            style={{ backgroundColor: 'var(--color-surface-hover)' }}
          >
            <div role="region" aria-labelledby={labelId}>
              {drilldown.status === 'loading' && (
                <p className="py-2 text-xs [color:var(--color-text-muted)]">
                  Carregando atendimentos…
                </p>
              )}
              {drilldown.status === 'error' && (
                <p
                  role="alert"
                  className="py-2 text-xs [color:var(--color-error,#b91c1c)]"
                >
                  {drilldown.error ?? 'Falha ao carregar.'}
                </p>
              )}
              {drilldown.status === 'loaded' &&
                (drilldown.rows.length === 0 ? (
                  <p className="py-2 text-xs [color:var(--color-text-muted)]">
                    Sem atendimentos no período.
                  </p>
                ) : (
                  <DrilldownTable rows={drilldown.rows} />
                ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function DrilldownTable({ rows }: { rows: CommissionRow[] }) {
  return (
    <table
      className="w-full border-collapse text-xs"
      data-testid="commission-drilldown-table"
    >
      <thead>
        <tr>
          <th scope="col" className="px-2 py-1 text-left">Data</th>
          <th scope="col" className="px-2 py-1 text-left">Cliente</th>
          <th scope="col" className="px-2 py-1 text-left">Serviço</th>
          <th scope="col" className="px-2 py-1 text-right">Valor</th>
          <th scope="col" className="px-2 py-1 text-right">%</th>
          <th scope="col" className="px-2 py-1 text-right">Comissão</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.commissionEntryId}
            className="border-t"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <td className="px-2 py-1">
              {formatInTimeZone(
                new Date(row.scheduledAt),
                BR_TIMEZONE,
                'dd/MM/yyyy',
                { locale: ptBR },
              )}
            </td>
            <td className="px-2 py-1">{row.clientName}</td>
            <td className="px-2 py-1">{row.serviceName}</td>
            <td className="px-2 py-1 text-right">
              {formatBrl(row.servicePriceBrl)}
            </td>
            <td className="px-2 py-1 text-right">{row.percentApplied}%</td>
            <td className="px-2 py-1 text-right">
              {formatBrl(row.commissionAmountBrl)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function EmptyState({ periodLabel }: { periodLabel: string }) {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border p-12 text-center"
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--color-surface)',
      }}
      data-testid="commission-empty"
    >
      <span
        aria-hidden
        className="flex h-14 w-14 items-center justify-center rounded-full text-2xl"
        style={{
          backgroundColor: 'var(--color-accent-50)',
          color: 'var(--color-accent-600)',
        }}
      >
        💼
      </span>
      <h2 className="text-lg font-medium [color:var(--color-text-strong)]">
        Nenhum atendimento concluído no período
      </h2>
      <p className="max-w-md text-sm [color:var(--color-text-muted)]">
        Não há atendimentos com status concluído entre{' '}
        <strong>{periodLabel}</strong>. Ajuste o filtro para um período com
        atendimentos finalizados.
      </p>
    </div>
  );
}

function PresetButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[var(--radius-md)] border px-2.5 py-1 text-xs"
      style={{
        borderColor: 'var(--color-border)',
        color: 'var(--color-text-muted)',
      }}
    >
      {children}
    </button>
  );
}

function PrintStyles() {
  return (
    <style
      // Dynamically applied print stylesheet — hides app chrome + ensures
      // tables print without page-breaks mid-section.
      dangerouslySetInnerHTML={{
        __html: `
          @media print {
            header[class*="sticky"],
            aside,
            nav,
            [data-testid="commission-filter"] {
              display: none !important;
            }
            body, html, main {
              background: white !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            table { page-break-inside: avoid; }
            tr { page-break-inside: avoid; }
            @page { size: A4 portrait; margin: 1cm; }
          }
        `,
      }}
    />
  );
}

/* ----------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------*/

function computePresetWindow(preset: 'current' | 'previous' | 'last30'): {
  from: Date;
  to: Date;
} {
  const now = new Date();
  const nowSp = toZonedTime(now, BR_TIMEZONE);

  if (preset === 'current') {
    return {
      from: fromZonedTime(startOfMonth(nowSp), BR_TIMEZONE),
      to: fromZonedTime(startOfMonth(addMonths(nowSp, 1)), BR_TIMEZONE),
    };
  }
  if (preset === 'previous') {
    return {
      from: fromZonedTime(startOfMonth(addMonths(nowSp, -1)), BR_TIMEZONE),
      to: fromZonedTime(startOfMonth(nowSp), BR_TIMEZONE),
    };
  }
  // last30
  const fromSp = subDays(nowSp, 30);
  return {
    from: fromZonedTime(fromSp, BR_TIMEZONE),
    to: fromZonedTime(nowSp, BR_TIMEZONE),
  };
}

function formatPtBr(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Returns yyyy-mm-dd for "exclusive to" minus 1 day, since the period filter
 * uses half-open `[from, to)` but we display "from–to inclusive" to user.
 */
function subDayLabel(yyyyMmDd: string): string {
  const parts = yyyyMmDd.split('-').map(Number);
  const y = parts[0] ?? 1970;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - 1);
  return formatYyyyMmDdSp(date);
}

function triggerCsvDownload(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
