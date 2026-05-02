import type { ResolveRateInput, ResolveRateResult } from './types';

/**
 * Resolves the commission percent that should be applied for a given
 * (professional, service) pair using the 3-tier precedence rule defined
 * in ADR-0004.
 *
 * Precedence:
 *  1. If professional.commissionMode === 'TABLE' AND a tableEntry exists
 *     → use tableEntry.percent (source: TABLE_ENTRY)
 *  2. Else if service.commissionOverridePercent is not null
 *     → use it (source: SERVICE_OVERRIDE)
 *  3. Else use professional.commissionDefaultPercent
 *     (source: PROFESSIONAL_DEFAULT)
 *
 * Pure function — no DB access. Caller pre-fetches all inputs.
 *
 * @see Story 4.1 Dev Notes — AC1(b) Interpretation A approved by @po 2026-05-02
 */
export function resolveRate(input: ResolveRateInput): ResolveRateResult {
  const { professional, service, tableEntry } = input;

  // Tier 1: TABLE_ENTRY (only when in TABLE mode AND entry exists)
  if (professional.commissionMode === 'TABLE' && tableEntry !== null) {
    return {
      percentApplied: tableEntry.percent,
      source: 'TABLE_ENTRY',
    };
  }

  // Tier 2: SERVICE_OVERRIDE (applies in both modes when service has override)
  if (service.commissionOverridePercent !== null) {
    return {
      percentApplied: service.commissionOverridePercent,
      source: 'SERVICE_OVERRIDE',
    };
  }

  // Tier 3: PROFESSIONAL_DEFAULT
  return {
    percentApplied: professional.commissionDefaultPercent,
    source: 'PROFESSIONAL_DEFAULT',
  };
}
