import { describe, expect, it } from 'vitest';
import { canCancelNow, formatCancelWindowMessage } from './cancel-window';

describe('canCancelNow', () => {
  const now = new Date('2026-05-01T10:00:00Z');

  it('allows when scheduled comfortably outside the window', () => {
    const scheduledAt = new Date('2026-05-02T15:00:00Z'); // ~29h away
    const result = canCancelNow(scheduledAt, 24, now);
    expect(result.allowed).toBe(true);
  });

  it('allows when exactly at the window boundary (inclusive)', () => {
    const scheduledAt = new Date('2026-05-02T10:00:00Z'); // exactly 24h away
    const result = canCancelNow(scheduledAt, 24, now);
    expect(result.allowed).toBe(true);
  });

  it('blocks when inside the 24h window', () => {
    const scheduledAt = new Date('2026-05-02T09:00:00Z'); // 23h away
    const result = canCancelNow(scheduledAt, 24, now);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toBe('window_closed');
      expect(result.windowHours).toBe(24);
    }
  });

  it('defaults to 24h when windowHours is null/undefined', () => {
    const scheduledAt = new Date('2026-05-02T09:00:00Z'); // 23h away
    expect(canCancelNow(scheduledAt, null, now).allowed).toBe(false);
    expect(canCancelNow(scheduledAt, undefined, now).allowed).toBe(false);
  });

  it('defaults to 24h when windowHours is negative (invalid)', () => {
    const scheduledAt = new Date('2026-05-02T09:00:00Z'); // 23h away
    const result = canCancelNow(scheduledAt, -5, now);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.windowHours).toBe(24);
    }
  });

  it('allows any window when windowHours = 0 (no restriction)', () => {
    const scheduledAt = new Date('2026-05-01T11:00:00Z'); // 1h away
    const result = canCancelNow(scheduledAt, 0, now);
    expect(result.allowed).toBe(true);
  });

  it('blocks even at 0.5h before scheduled when window = 1h', () => {
    const scheduledAt = new Date('2026-05-01T10:30:00Z'); // 0.5h away
    const result = canCancelNow(scheduledAt, 1, now);
    expect(result.allowed).toBe(false);
  });

  it('allows at past appointments when window is generous (edge case handled by terminal-status guard upstream)', () => {
    const scheduledAt = new Date('2026-04-01T10:00:00Z'); // a month ago
    const result = canCancelNow(scheduledAt, 24, now);
    // Pure math: scheduled - 24h = 2026-03-31T10:00Z, now > that → blocked
    expect(result.allowed).toBe(false);
  });
});

describe('formatCancelWindowMessage', () => {
  it('interpolates the window hours', () => {
    expect(formatCancelWindowMessage(24)).toContain('24h');
    expect(formatCancelWindowMessage(48)).toContain('48h');
  });
});
