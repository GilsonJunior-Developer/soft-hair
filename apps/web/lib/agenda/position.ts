import { toZonedTime } from 'date-fns-tz';
import { BR_TIMEZONE } from './date-range';

/**
 * Agenda grid: from GRID_START_HOUR to GRID_END_HOUR, one row per 30 min.
 * Each 30-min slot = 1 grid-row-unit (48 px default, customizable via CSS var).
 */
export const GRID_START_HOUR = 7;
export const GRID_END_HOUR = 22;
export const SLOT_MINUTES = 30;
export const TOTAL_SLOTS = (GRID_END_HOUR - GRID_START_HOUR) * (60 / SLOT_MINUTES);

/**
 * Convert an appointment {scheduledAt, endsAt} into grid top/height (in slot units).
 * Returns null if the appointment falls outside the visible grid.
 */
export function appointmentToGridStyle(
  scheduledAt: Date,
  endsAt: Date,
): { top: number; height: number } | null {
  const startZoned = toZonedTime(scheduledAt, BR_TIMEZONE);
  const endZoned = toZonedTime(endsAt, BR_TIMEZONE);

  const startMinutes =
    (startZoned.getHours() - GRID_START_HOUR) * 60 + startZoned.getMinutes();
  const endMinutes =
    (endZoned.getHours() - GRID_START_HOUR) * 60 + endZoned.getMinutes();

  if (endMinutes <= 0) return null;
  if (startMinutes >= TOTAL_SLOTS * SLOT_MINUTES) return null;

  const clampedStart = Math.max(0, startMinutes);
  const clampedEnd = Math.min(TOTAL_SLOTS * SLOT_MINUTES, endMinutes);

  return {
    top: clampedStart / SLOT_MINUTES,
    height: Math.max(1, (clampedEnd - clampedStart) / SLOT_MINUTES),
  };
}

/**
 * Current-time indicator position (in slot units) or null if outside grid.
 */
export function nowToGridOffset(now: Date = new Date()): number | null {
  const zoned = toZonedTime(now, BR_TIMEZONE);
  const minutes =
    (zoned.getHours() - GRID_START_HOUR) * 60 + zoned.getMinutes();
  if (minutes < 0 || minutes >= TOTAL_SLOTS * SLOT_MINUTES) return null;
  return minutes / SLOT_MINUTES;
}
