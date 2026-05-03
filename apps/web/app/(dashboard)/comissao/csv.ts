/**
 * CSV formatter for the commission report (Story 4.3 Task 5).
 *
 * Brazilian payroll software (Excel-BR) expectations:
 *   - UTF-8 BOM (`﻿`) prefix so Excel-BR detects encoding instead of
 *     mangling accents
 *   - Separator `;` (Excel-BR locale uses comma as decimal separator)
 *   - Line endings `\r\n` (Windows + macOS Excel both accept)
 *   - Decimal comma in BRL columns (`R$ 1.234,56`)
 *   - Date format `dd/MM/yyyy`
 */

import { formatInTimeZone } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';
import { BR_TIMEZONE } from '@/lib/agenda/date-range';
import { formatBrl } from '@/lib/format';
import type { CommissionRow } from './types';

const HEADER = [
  'Profissional',
  'Data',
  'Cliente',
  'Serviço',
  'Valor (R$)',
  '% Comissão',
  'Comissão (R$)',
] as const;

export type CsvInputRow = CommissionRow & { professionalName: string };

/**
 * Generates the full CSV string (BOM + header + rows + total). Pure function:
 * caller wraps in a `Blob` and triggers download. Designed for ≤500 rows
 * (story scale). Allocations are intentional (string concat) for clarity.
 */
export function formatCommissionCsv(rows: CsvInputRow[]): string {
  const lines: string[] = [HEADER.join(';')];

  for (const row of rows) {
    lines.push(
      [
        escapeField(row.professionalName),
        formatInTimeZone(new Date(row.scheduledAt), BR_TIMEZONE, 'dd/MM/yyyy', {
          locale: ptBR,
        }),
        escapeField(row.clientName),
        escapeField(row.serviceName),
        formatBrlBare(row.servicePriceBrl),
        formatPercentBare(row.percentApplied),
        formatBrlBare(row.commissionAmountBrl),
      ].join(';'),
    );
  }

  const totalCommission = rows.reduce(
    (sum, r) => sum + r.commissionAmountBrl,
    0,
  );
  lines.push(`TOTAL;;;;;;${formatBrlBare(totalCommission)}`);

  // BOM + CRLF line endings.
  return '﻿' + lines.join('\r\n');
}

/**
 * Escape a CSV field per RFC 4180 (extended for `;` separator):
 *   - Wrap in `"..."` if the field contains `;`, `"`, `\r`, or `\n`
 *   - Double any embedded `"` characters
 */
function escapeField(value: string): string {
  if (/[;"\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * BRL formatted as a bare number with comma decimal (no `R$` prefix — column
 * header already says `(R$)`). Includes thousands separator via `formatBrl`
 * for visual alignment with the on-screen report.
 */
function formatBrlBare(value: number): string {
  // formatBrl returns e.g. "R$ 1.234,56"; strip the prefix for CSV columns.
  return formatBrl(value).replace(/^R\$\s*/, '');
}

function formatPercentBare(value: number): string {
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
}

/**
 * Suggested filename for the download. Caller composes with salon slug.
 */
export function buildCsvFilename(opts: {
  salonSlug: string;
  fromYyyyMmDd: string;
  toYyyyMmDd: string;
}): string {
  return `comissao_${opts.salonSlug}_${opts.fromYyyyMmDd}_${opts.toYyyyMmDd}.csv`;
}
