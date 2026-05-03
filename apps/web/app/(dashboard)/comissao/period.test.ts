// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  defaultMonthWindow,
  formatYyyyMmDdSp,
  parsePeriodSearchParams,
} from './period';

describe('defaultMonthWindow (TIMEZONE-FINDING-4.3-001)', () => {
  it('returns SP-midnight boundaries for current month', () => {
    // Pin "now" to mid-May 2026 in São Paulo (UTC-3).
    const nowInSp = new Date('2026-05-15T12:00:00-03:00');
    const window = defaultMonthWindow(nowInSp);
    // 2026-05-01T00:00:00-03:00 = 2026-05-01T03:00:00Z
    expect(window.from.toISOString()).toBe('2026-05-01T03:00:00.000Z');
    expect(window.to.toISOString()).toBe('2026-06-01T03:00:00.000Z');
  });

  it('boundary case: appointment at 23h SP on last day of April does NOT leak into May report', () => {
    // Pin now mid-May. Window = May.
    const window = defaultMonthWindow(new Date('2026-05-15T12:00:00-03:00'));

    // Appointment scheduled at 23:30 SP on April 30 = 02:30 UTC on May 1.
    const apptUtc = new Date('2026-05-01T02:30:00.000Z');

    // The appointment timestamp must be BEFORE the May window's `from`.
    expect(apptUtc < window.from).toBe(true);
  });

  it('handles year boundary (December → January window)', () => {
    const window = defaultMonthWindow(new Date('2026-12-15T12:00:00-03:00'));
    expect(window.from.toISOString()).toBe('2026-12-01T03:00:00.000Z');
    expect(window.to.toISOString()).toBe('2027-01-01T03:00:00.000Z');
  });
});

describe('parsePeriodSearchParams', () => {
  it('parses yyyy-MM-dd date strings as SP midnight', () => {
    const window = parsePeriodSearchParams('2026-05-01', '2026-06-01');
    expect(window.from.toISOString()).toBe('2026-05-01T03:00:00.000Z');
    expect(window.to.toISOString()).toBe('2026-06-01T03:00:00.000Z');
  });

  it('parses full ISO 8601 trusting the offset', () => {
    const window = parsePeriodSearchParams(
      '2026-05-01T03:00:00Z',
      '2026-06-01T03:00:00Z',
    );
    expect(window.from.toISOString()).toBe('2026-05-01T03:00:00.000Z');
  });

  it('falls back to default month window on missing input', () => {
    const fallback = parsePeriodSearchParams(undefined, undefined);
    const expected = defaultMonthWindow();
    expect(fallback.from.toISOString()).toBe(expected.from.toISOString());
    expect(fallback.to.toISOString()).toBe(expected.to.toISOString());
  });

  it('falls back to default when from >= to', () => {
    const result = parsePeriodSearchParams('2026-06-01', '2026-05-01');
    const expected = defaultMonthWindow();
    expect(result.from.toISOString()).toBe(expected.from.toISOString());
  });

  it('falls back to default on invalid input strings', () => {
    const result = parsePeriodSearchParams('not-a-date', '2026-05-01');
    const expected = defaultMonthWindow();
    expect(result.from.toISOString()).toBe(expected.from.toISOString());
  });
});

describe('formatYyyyMmDdSp', () => {
  it('formats UTC date as yyyy-mm-dd in SP timezone', () => {
    // 02:30 UTC on May 1 = 23:30 SP on April 30.
    expect(formatYyyyMmDdSp(new Date('2026-05-01T02:30:00.000Z'))).toBe(
      '2026-04-30',
    );
    // 03:00 UTC on May 1 = 00:00 SP on May 1.
    expect(formatYyyyMmDdSp(new Date('2026-05-01T03:00:00.000Z'))).toBe(
      '2026-05-01',
    );
  });
});
