import {
  addDays,
  addMonths,
  addWeeks,
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';

export const BR_TIMEZONE = 'America/Sao_Paulo';

export type AgendaView = 'day' | 'week' | 'month';

export type AgendaWindow = {
  from: Date;
  to: Date;
  view: AgendaView;
  anchor: Date;
};

export function isAgendaView(v: string | null | undefined): v is AgendaView {
  return v === 'day' || v === 'week' || v === 'month';
}

/**
 * Parse anchor date (YYYY-MM-DD) as local date in SP timezone.
 * Falls back to "today in SP" on invalid input.
 */
export function parseAnchor(input: string | null | undefined): Date {
  if (input && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const localMidnight = new Date(`${input}T00:00:00`);
    return fromZonedTime(localMidnight, BR_TIMEZONE);
  }
  return new Date();
}

export function formatAnchor(date: Date): string {
  const zoned = toZonedTime(date, BR_TIMEZONE);
  const yyyy = zoned.getFullYear();
  const mm = String(zoned.getMonth() + 1).padStart(2, '0');
  const dd = String(zoned.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Compute the [from, to) window for a given view anchored at `anchor`.
 * Boundaries are wall-clock in America/Sao_Paulo, converted to UTC for queries.
 */
export function computeWindow(view: AgendaView, anchor: Date): AgendaWindow {
  const zoned = toZonedTime(anchor, BR_TIMEZONE);
  let fromZoned: Date;
  let toZoned: Date;

  switch (view) {
    case 'day':
      fromZoned = startOfDay(zoned);
      toZoned = endOfDay(zoned);
      break;
    case 'week':
      fromZoned = startOfWeek(zoned, { weekStartsOn: 1 });
      toZoned = endOfWeek(zoned, { weekStartsOn: 1 });
      break;
    case 'month':
      fromZoned = startOfMonth(zoned);
      toZoned = endOfMonth(zoned);
      break;
  }

  return {
    from: fromZonedTime(fromZoned, BR_TIMEZONE),
    to: fromZonedTime(toZoned, BR_TIMEZONE),
    view,
    anchor,
  };
}

export function shiftAnchor(view: AgendaView, anchor: Date, delta: -1 | 1): Date {
  switch (view) {
    case 'day':
      return addDays(anchor, delta);
    case 'week':
      return addWeeks(anchor, delta);
    case 'month':
      return addMonths(anchor, delta);
  }
}
