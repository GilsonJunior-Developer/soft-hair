/**
 * Period helpers for the monthly commission report.
 *
 * Critical correctness contract (PO finding TIMEZONE-FINDING-4.3-001 from
 * Story 4.3 validation): all month boundaries are wall-clock midnight in
 * `America/Sao_Paulo` (UTC-3), then converted to absolute UTC for queries.
 *
 * Without this, an appointment at 23:30 São Paulo on 30/Apr (= 02:30 UTC on
 * 1/May) would be misattributed to May in a UTC-naive filter, breaking the
 * salon owner's "fechamento mensal" mental model.
 *
 * Pattern mirrors `apps/web/lib/agenda/date-range.ts:53-79` (`computeWindow`).
 */

import { addMonths, startOfMonth } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { BR_TIMEZONE } from '@/lib/agenda/date-range';

export type PeriodWindow = {
  /** UTC ISO instant representing midnight SP at the start of the from-month. */
  from: Date;
  /** UTC ISO instant representing midnight SP at the start of the next month after to-month. */
  to: Date;
};

/**
 * Default window = current SP month: midnight SP of day-1 → midnight SP of day-1 of next month.
 */
export function defaultMonthWindow(now: Date = new Date()): PeriodWindow {
  const nowInSp = toZonedTime(now, BR_TIMEZONE);
  const fromZoned = startOfMonth(nowInSp);
  const toZoned = startOfMonth(addMonths(nowInSp, 1));
  return {
    from: fromZonedTime(fromZoned, BR_TIMEZONE),
    to: fromZonedTime(toZoned, BR_TIMEZONE),
  };
}

/**
 * Parse `from`/`to` searchParams (URL strings).
 * Accepts `yyyy-MM-dd` (interpreted as midnight in SP) OR full ISO 8601.
 * Falls back to {@link defaultMonthWindow} on missing/invalid input.
 */
export function parsePeriodSearchParams(
  rawFrom: string | undefined,
  rawTo: string | undefined,
): PeriodWindow {
  const fromParsed = parseOne(rawFrom);
  const toParsed = parseOne(rawTo);

  if (!fromParsed || !toParsed || fromParsed >= toParsed) {
    return defaultMonthWindow();
  }
  return { from: fromParsed, to: toParsed };
}

function parseOne(raw: string | undefined): Date | null {
  if (!raw) return null;
  // Date-only form: interpret as midnight in SP.
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const localMidnight = new Date(`${raw}T00:00:00`);
    if (Number.isNaN(localMidnight.getTime())) return null;
    return fromZonedTime(localMidnight, BR_TIMEZONE);
  }
  // Full ISO 8601 — trust the offset.
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

/**
 * Format a UTC date back to `yyyy-MM-dd` in SP timezone (for `<input type="date">` values + URL params).
 */
export function formatYyyyMmDdSp(date: Date): string {
  const zoned = toZonedTime(date, BR_TIMEZONE);
  const yyyy = zoned.getFullYear();
  const mm = String(zoned.getMonth() + 1).padStart(2, '0');
  const dd = String(zoned.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
