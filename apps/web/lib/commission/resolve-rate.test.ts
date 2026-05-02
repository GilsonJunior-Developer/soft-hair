// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { resolveRate } from './resolve-rate';
import type { ResolveRateInput } from './types';

const baseProfessional = {
  commissionMode: 'PERCENT_FIXED' as const,
  commissionDefaultPercent: 40,
};

const baseService = {
  commissionOverridePercent: null,
};

function input(overrides: Partial<ResolveRateInput> = {}): ResolveRateInput {
  return {
    professional: { ...baseProfessional, ...overrides.professional },
    service: { ...baseService, ...overrides.service },
    tableEntry: overrides.tableEntry ?? null,
  };
}

describe('resolveRate — 3-tier precedence (ADR-0004)', () => {
  // Tier 3 — PROFESSIONAL_DEFAULT
  it('PERCENT_FIXED + no service override → uses professional default', () => {
    const result = resolveRate(input());
    expect(result.percentApplied).toBe(40);
    expect(result.source).toBe('PROFESSIONAL_DEFAULT');
  });

  // Tier 2 — SERVICE_OVERRIDE in PERCENT_FIXED mode
  it('PERCENT_FIXED + service override → uses service override', () => {
    const result = resolveRate(
      input({ service: { commissionOverridePercent: 50 } }),
    );
    expect(result.percentApplied).toBe(50);
    expect(result.source).toBe('SERVICE_OVERRIDE');
  });

  // Tier 1 — TABLE_ENTRY wins over everything
  it('TABLE + entry exists → uses table entry (overrides service)', () => {
    const result = resolveRate(
      input({
        professional: {
          commissionMode: 'TABLE',
          commissionDefaultPercent: 40,
        },
        service: { commissionOverridePercent: 50 },
        tableEntry: { percent: 70 },
      }),
    );
    expect(result.percentApplied).toBe(70);
    expect(result.source).toBe('TABLE_ENTRY');
  });

  // Tier 1 → 2 fallback
  it('TABLE + no entry + service override → falls back to service override', () => {
    const result = resolveRate(
      input({
        professional: {
          commissionMode: 'TABLE',
          commissionDefaultPercent: 40,
        },
        service: { commissionOverridePercent: 35 },
      }),
    );
    expect(result.percentApplied).toBe(35);
    expect(result.source).toBe('SERVICE_OVERRIDE');
  });

  // Tier 1 → 3 fallback (no service override either)
  it('TABLE + no entry + no service override → falls back to professional default', () => {
    const result = resolveRate(
      input({
        professional: {
          commissionMode: 'TABLE',
          commissionDefaultPercent: 45,
        },
      }),
    );
    expect(result.percentApplied).toBe(45);
    expect(result.source).toBe('PROFESSIONAL_DEFAULT');
  });

  // Boundary: 0%
  it('boundary: percent=0 from professional default', () => {
    const result = resolveRate(
      input({ professional: { ...baseProfessional, commissionDefaultPercent: 0 } }),
    );
    expect(result.percentApplied).toBe(0);
    expect(result.source).toBe('PROFESSIONAL_DEFAULT');
  });

  // Boundary: 100%
  it('boundary: percent=100 from service override', () => {
    const result = resolveRate(
      input({ service: { commissionOverridePercent: 100 } }),
    );
    expect(result.percentApplied).toBe(100);
    expect(result.source).toBe('SERVICE_OVERRIDE');
  });

  // Boundary: 100% from table entry
  it('boundary: percent=100 from table entry', () => {
    const result = resolveRate(
      input({
        professional: {
          commissionMode: 'TABLE',
          commissionDefaultPercent: 40,
        },
        tableEntry: { percent: 100 },
      }),
    );
    expect(result.percentApplied).toBe(100);
    expect(result.source).toBe('TABLE_ENTRY');
  });

  // Service override = 0 is meaningful (not null) — must be respected
  it('PERCENT_FIXED + service override=0 → uses 0 (not falls through to default)', () => {
    const result = resolveRate(
      input({ service: { commissionOverridePercent: 0 } }),
    );
    expect(result.percentApplied).toBe(0);
    expect(result.source).toBe('SERVICE_OVERRIDE');
  });

  // Table entry = 0 is meaningful (not null) — must be respected
  it('TABLE + entry=0 → uses 0 (not falls through)', () => {
    const result = resolveRate(
      input({
        professional: {
          commissionMode: 'TABLE',
          commissionDefaultPercent: 40,
        },
        service: { commissionOverridePercent: 50 },
        tableEntry: { percent: 0 },
      }),
    );
    expect(result.percentApplied).toBe(0);
    expect(result.source).toBe('TABLE_ENTRY');
  });

  // PERCENT_FIXED ignores tableEntry even if present (defensive — UI shouldn't pass it,
  // but if it does, mode wins)
  it('PERCENT_FIXED + tableEntry passed → ignored, mode takes precedence', () => {
    const result = resolveRate(
      input({
        professional: { ...baseProfessional, commissionMode: 'PERCENT_FIXED' },
        tableEntry: { percent: 99 },
      }),
    );
    // PERCENT_FIXED + no service override → professional default (40)
    expect(result.percentApplied).toBe(40);
    expect(result.source).toBe('PROFESSIONAL_DEFAULT');
  });

  // Realistic scenario from PRD example
  it('realistic: profissional X em TABLE com corte=50%, coloração=30%; corte resolve TABLE_ENTRY', () => {
    const corteEntry = { percent: 50 };
    const result = resolveRate(
      input({
        professional: {
          commissionMode: 'TABLE',
          commissionDefaultPercent: 40,
        },
        tableEntry: corteEntry,
      }),
    );
    expect(result.percentApplied).toBe(50);
    expect(result.source).toBe('TABLE_ENTRY');
  });
});
