import type { CalculateInput, CalculateResult } from './types';

/**
 * Calculates commission amount in BRL given a service price and the resolved
 * commission percent.
 *
 * Math (avoiding float drift):
 *   amount_cents = round(price_brl * 100 * percent)        // integer cents × 100
 *   amount_brl   = amount_cents / 10000                    // back to BRL with 2dp
 *
 * Equivalent to: round(price * percent) / 100, but guarantees we never lose
 * precision on inputs like 33.33% × R$ 9.97. Uses HALF_UP rounding (Math.round
 * in JS rounds 0.5 toward +Infinity for positive numbers, which is what we want
 * for fractional cents in commission).
 *
 * Pure function. Caller is responsible for passing the already-discounted price
 * (`appointments.price_brl_final`, not `price_brl_original`) — see Story 4.1
 * Dev Notes "AC5 immutability".
 *
 * @throws Error if servicePriceBrl < 0 or percentApplied not in [0, 100].
 */
export function calculateCommission(input: CalculateInput): CalculateResult {
  const { servicePriceBrl, percentApplied } = input;

  if (servicePriceBrl < 0) {
    throw new Error('calculateCommission: servicePriceBrl must be >= 0');
  }
  if (percentApplied < 0 || percentApplied > 100) {
    throw new Error(
      'calculateCommission: percentApplied must be between 0 and 100',
    );
  }

  // Convert BRL to integer cents to avoid float drift, then apply percent.
  // We multiply by 100 twice (once for percent fractional, once for cents).
  const priceInCents = Math.round(servicePriceBrl * 100);
  const commissionInCents = Math.round((priceInCents * percentApplied) / 100);
  const commissionAmountBrl = commissionInCents / 100;

  return { commissionAmountBrl };
}
