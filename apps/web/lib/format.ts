/**
 * Shared formatting helpers (Story 4.3 Task 10 — closes 4.1-MNT-001 + 4.2-MNT-001).
 *
 * 3rd-usage threshold met (commission-simulator.tsx, appointment-detail-dialog.tsx,
 * commission report); extracting here per the codebase rule to avoid drift.
 */

/**
 * Brazilian Real currency formatter.
 *
 * Uses `Intl.NumberFormat` via `toLocaleString` so thousands separator (`.`)
 * and decimal separator (`,`) follow `pt-BR` locale (e.g. `R$ 1.234,56`).
 */
export function formatBrl(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}
