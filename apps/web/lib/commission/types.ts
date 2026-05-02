/**
 * Commission engine types — Story 4.1.
 *
 * The engine is purely functional: caller pre-fetches data and invokes
 * pure resolution + calculation functions. No Supabase client here.
 */

export type CommissionMode = 'PERCENT_FIXED' | 'TABLE';

export type CommissionRateSource =
  | 'TABLE_ENTRY'
  | 'SERVICE_OVERRIDE'
  | 'PROFESSIONAL_DEFAULT';

export type ProfessionalRule = {
  /** Mode flag from professionals.commission_mode */
  commissionMode: CommissionMode;
  /** Default percent from professionals.commission_default_percent (0-100) */
  commissionDefaultPercent: number;
};

export type ServiceRule = {
  /** Override from services.commission_override_percent (0-100); null = no override */
  commissionOverridePercent: number | null;
};

export type TableEntry = {
  /** Percent from professional_service_commissions.percent (0-100) */
  percent: number;
};

export type ResolveRateInput = {
  professional: ProfessionalRule;
  service: ServiceRule;
  /** Entry from professional_service_commissions for (prof, service); null = no entry */
  tableEntry: TableEntry | null;
};

export type ResolveRateResult = {
  /** Percent that should be applied (0-100). NUMERIC(5,2) precision preserved as Number. */
  percentApplied: number;
  /** Where the percent came from in the 3-tier precedence */
  source: CommissionRateSource;
};

export type CalculateInput = {
  /** Service price in BRL after any discount (caller's responsibility to pre-discount) */
  servicePriceBrl: number;
  /** Percent to apply (0-100) */
  percentApplied: number;
};

export type CalculateResult = {
  /** Commission in BRL, rounded to 2 decimal places (HALF_UP banker-safe) */
  commissionAmountBrl: number;
};
