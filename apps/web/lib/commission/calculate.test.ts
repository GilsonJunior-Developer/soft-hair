// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { calculateCommission } from './calculate';

describe('calculateCommission — math + rounding', () => {
  it('PRD example: 10 cortes a R$ 50, profissional 40% → R$ 200 cada cálculo unitário', () => {
    // Caller computes per-cut commission and sums; here we verify per-cut math
    const result = calculateCommission({
      servicePriceBrl: 50,
      percentApplied: 40,
    });
    expect(result.commissionAmountBrl).toBe(20);
  });

  it('simple: R$ 100 × 50% = R$ 50', () => {
    expect(
      calculateCommission({ servicePriceBrl: 100, percentApplied: 50 })
        .commissionAmountBrl,
    ).toBe(50);
  });

  it('zero price → zero commission', () => {
    expect(
      calculateCommission({ servicePriceBrl: 0, percentApplied: 50 })
        .commissionAmountBrl,
    ).toBe(0);
  });

  it('zero percent → zero commission', () => {
    expect(
      calculateCommission({ servicePriceBrl: 100, percentApplied: 0 })
        .commissionAmountBrl,
    ).toBe(0);
  });

  it('100% → full price as commission', () => {
    expect(
      calculateCommission({ servicePriceBrl: 87.5, percentApplied: 100 })
        .commissionAmountBrl,
    ).toBe(87.5);
  });

  // Rounding HALF_UP
  it('rounding: 33.33% × R$ 10 = R$ 3.33 (HALF_UP)', () => {
    // 10 * 33.33 = 333.30 → /100 = 3.333 → round to 3.33
    const result = calculateCommission({
      servicePriceBrl: 10,
      percentApplied: 33.33,
    });
    expect(result.commissionAmountBrl).toBe(3.33);
  });

  it('rounding: 33.33% × R$ 9.97 → expected 3.32', () => {
    // 9.97 * 33.33 = 332.2001 → /100 = 3.322001 → round to 3.32
    const result = calculateCommission({
      servicePriceBrl: 9.97,
      percentApplied: 33.33,
    });
    expect(result.commissionAmountBrl).toBe(3.32);
  });

  it('rounding HALF_UP at .5 boundary: 50% × R$ 0.05 = R$ 0.03 (Math.round of 2.5 = 3)', () => {
    // 0.05 * 50 = 2.5 cents → Math.round(2.5) = 3 → 0.03 BRL
    const result = calculateCommission({
      servicePriceBrl: 0.05,
      percentApplied: 50,
    });
    expect(result.commissionAmountBrl).toBe(0.03);
  });

  it('large numbers: R$ 10000 × 40% = R$ 4000', () => {
    expect(
      calculateCommission({ servicePriceBrl: 10000, percentApplied: 40 })
        .commissionAmountBrl,
    ).toBe(4000);
  });

  it('avoids float drift: 0.1 + 0.2 problem area — 30% × R$ 0.10 = R$ 0.03', () => {
    // Naive: 0.10 * 0.30 = 0.030000000000000002 in float
    // Our impl: round(10 * 30 / 100) = round(3) = 3 cents = 0.03
    const result = calculateCommission({
      servicePriceBrl: 0.1,
      percentApplied: 30,
    });
    expect(result.commissionAmountBrl).toBe(0.03);
  });

  it('throws on negative price', () => {
    expect(() =>
      calculateCommission({ servicePriceBrl: -1, percentApplied: 40 }),
    ).toThrow(/servicePriceBrl/);
  });

  it('throws on percent > 100', () => {
    expect(() =>
      calculateCommission({ servicePriceBrl: 100, percentApplied: 101 }),
    ).toThrow(/percentApplied/);
  });

  it('throws on percent < 0', () => {
    expect(() =>
      calculateCommission({ servicePriceBrl: 100, percentApplied: -1 }),
    ).toThrow(/percentApplied/);
  });

  // Real-world: discount applied — caller passes discounted price
  it('caller responsibility: pass discounted price (price_brl_final), not original', () => {
    // Service was R$ 100, client used R$ 20 credit, so price_brl_final = 80
    const result = calculateCommission({
      servicePriceBrl: 80,
      percentApplied: 40,
    });
    expect(result.commissionAmountBrl).toBe(32); // 32, not 40
  });
});
