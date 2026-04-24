/**
 * Pure helper for the client cancel window check (Story 2.7).
 *
 * The salon configures `cancel_window_hours` in `salons.settings_jsonb`
 * (default 24h). A client may cancel their own appointment only while
 * `now` is still at least that many hours before the scheduled start.
 *
 * Returns a discriminated union so the caller can distinguish the
 * "not yet allowed" (still too far in the future — shouldn't happen
 * for real appointments) from the "window closed" (too close to start).
 */

export type CancelWindowCheck =
  | { allowed: true }
  | { allowed: false; reason: 'window_closed'; windowHours: number; scheduledAt: Date };

const DEFAULT_WINDOW_HOURS = 24;

export function canCancelNow(
  scheduledAt: Date,
  windowHours: number | null | undefined,
  now: Date = new Date(),
): CancelWindowCheck {
  const effectiveHours =
    typeof windowHours === 'number' && windowHours >= 0
      ? windowHours
      : DEFAULT_WINDOW_HOURS;

  const deadlineMs = scheduledAt.getTime() - effectiveHours * 60 * 60 * 1000;
  if (now.getTime() <= deadlineMs) {
    return { allowed: true };
  }
  return {
    allowed: false,
    reason: 'window_closed',
    windowHours: effectiveHours,
    scheduledAt,
  };
}

export function formatCancelWindowMessage(
  hours: number,
): string {
  return `Cancelamentos devem ser feitos com ${hours}h de antecedência. Entre em contato com o salão se precisar desmarcar agora.`;
}
