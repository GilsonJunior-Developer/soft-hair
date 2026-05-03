/**
 * Shared types for the monthly commission report (Story 4.3).
 *
 * READ-ONLY snapshot data: every field originates from `commission_entries`
 * (the snapshot Story 4.2 wrote at COMPLETED time) — never from current
 * `professionals.commission_default_percent` or any live rule lookup. See
 * AC5 immutability invariant (Story 4.2) and ADR-0004 amendment (Task 11.1).
 */

export type ProfessionalAggregate = {
  professionalId: string;
  professionalName: string;
  appointments: number;
  /** Sum of `commission_entries.service_price_brl` across the period. */
  revenueBrl: number;
  /** Sum of `commission_entries.commission_amount_brl` across the period. */
  commissionBrl: number;
};

export type CommissionReportTotals = {
  appointments: number;
  revenueBrl: number;
  commissionBrl: number;
};

export type CommissionReportSummary = {
  /** UTC ISO of the period lower bound (inclusive). */
  fromIso: string;
  /** UTC ISO of the period upper bound (exclusive). */
  toIso: string;
  rows: ProfessionalAggregate[];
  totals: CommissionReportTotals;
};

export type CommissionRow = {
  commissionEntryId: string;
  appointmentId: string;
  /** UTC ISO of `appointments.scheduled_at`. */
  scheduledAt: string;
  clientName: string;
  serviceName: string;
  servicePriceBrl: number;
  percentApplied: number;
  commissionAmountBrl: number;
};
