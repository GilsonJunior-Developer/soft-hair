import { describe, expect, it } from 'vitest';
import {
  buildCsvFilename,
  formatCommissionCsv,
  type CsvInputRow,
} from './csv';

const SAMPLE_ROW: CsvInputRow = {
  commissionEntryId: 'ce-1',
  appointmentId: 'a-1',
  scheduledAt: '2026-05-15T13:00:00-03:00', // 13h SP
  clientName: 'Maria Silva',
  serviceName: 'Corte Feminino',
  servicePriceBrl: 1234.56,
  percentApplied: 50,
  commissionAmountBrl: 617.28,
  professionalName: 'Ana',
};

describe('formatCommissionCsv (Story 4.3 Task 7.4 — Brazilian payroll convention)', () => {
  it('starts with UTF-8 BOM (Excel-BR encoding detection)', () => {
    const csv = formatCommissionCsv([SAMPLE_ROW]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it('uses ; as separator (NOT , — Excel-BR locale)', () => {
    const csv = formatCommissionCsv([SAMPLE_ROW]);
    const lines = csv.replace(/^﻿/, '').split('\r\n');
    const header = lines[0];
    expect(header).toBe(
      'Profissional;Data;Cliente;Serviço;Valor (R$);% Comissão;Comissão (R$)',
    );
    expect(header).not.toContain(',');
  });

  it('uses CRLF line endings', () => {
    const csv = formatCommissionCsv([SAMPLE_ROW]);
    expect(csv).toContain('\r\n');
    // No bare LFs that aren't preceded by CR.
    const stripped = csv.replace(/\r\n/g, '');
    expect(stripped).not.toContain('\n');
  });

  it('formats date column as dd/MM/yyyy in São Paulo timezone', () => {
    const csv = formatCommissionCsv([SAMPLE_ROW]);
    expect(csv).toContain(';15/05/2026;');
  });

  it('uses comma decimal separator + dot thousands separator in BRL columns', () => {
    const csv = formatCommissionCsv([SAMPLE_ROW]);
    // 1234.56 → "1.234,56"
    expect(csv).toContain('1.234,56');
    // 617.28 → "617,28"
    expect(csv).toContain('617,28');
  });

  it('strips R$ prefix from BRL columns (header already says (R$))', () => {
    const csv = formatCommissionCsv([SAMPLE_ROW]);
    const lines = csv.replace(/^﻿/, '').split('\r\n');
    // Data row should NOT contain "R$" — only numeric fields after column header.
    expect(lines[1]).not.toMatch(/R\$/);
  });

  it('appends a TOTAL row at bottom with summed commission', () => {
    const rows: CsvInputRow[] = [
      { ...SAMPLE_ROW, commissionAmountBrl: 100 },
      { ...SAMPLE_ROW, commissionAmountBrl: 250.5 },
      { ...SAMPLE_ROW, commissionAmountBrl: 49.5 },
    ];
    const csv = formatCommissionCsv(rows);
    const lines = csv.replace(/^﻿/, '').split('\r\n');
    expect(lines[lines.length - 1]).toBe('TOTAL;;;;;;400,00');
  });

  it('escapes fields containing semicolons or quotes per RFC 4180', () => {
    const tricky: CsvInputRow = {
      ...SAMPLE_ROW,
      clientName: 'Cliente "complicado"; com vírgula',
      serviceName: 'Serviço normal',
    };
    const csv = formatCommissionCsv([tricky]);
    // Wrapped in quotes + embedded quotes doubled.
    expect(csv).toContain('"Cliente ""complicado""; com vírgula"');
    expect(csv).not.toContain('Cliente "complicado"; com vírgula;Serviço'); // raw form would break
  });

  it('formats percent with % suffix', () => {
    const csv = formatCommissionCsv([SAMPLE_ROW]);
    expect(csv).toContain(';50%;');
  });

  it('handles empty input — header + TOTAL row only', () => {
    const csv = formatCommissionCsv([]);
    const lines = csv.replace(/^﻿/, '').split('\r\n');
    expect(lines).toHaveLength(2); // header + total
    expect(lines[1]).toBe('TOTAL;;;;;;0,00');
  });
});

describe('buildCsvFilename', () => {
  it('composes the documented format', () => {
    expect(
      buildCsvFilename({
        salonSlug: 'salao-da-maria',
        fromYyyyMmDd: '2026-05-01',
        toYyyyMmDd: '2026-06-01',
      }),
    ).toBe('comissao_salao-da-maria_2026-05-01_2026-06-01.csv');
  });
});
