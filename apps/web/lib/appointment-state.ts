export type AppointmentStatus =
  | 'PENDING_CONFIRMATION'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'NO_SHOW'
  | 'CANCELED';

export const APPOINTMENT_STATUSES: readonly AppointmentStatus[] = [
  'PENDING_CONFIRMATION',
  'CONFIRMED',
  'COMPLETED',
  'NO_SHOW',
  'CANCELED',
] as const;

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDING_CONFIRMATION: 'Pendente',
  CONFIRMED: 'Confirmado',
  COMPLETED: 'Atendido',
  NO_SHOW: 'No-show',
  CANCELED: 'Cancelado',
};

const TRANSITIONS: Record<AppointmentStatus, readonly AppointmentStatus[]> = {
  PENDING_CONFIRMATION: ['CONFIRMED', 'CANCELED'],
  CONFIRMED: ['COMPLETED', 'NO_SHOW', 'CANCELED'],
  COMPLETED: [],
  NO_SHOW: [],
  CANCELED: [],
};

export function canTransition(
  from: AppointmentStatus,
  to: AppointmentStatus,
): boolean {
  return TRANSITIONS[from].includes(to);
}

export function allowedTransitions(
  from: AppointmentStatus,
): readonly AppointmentStatus[] {
  return TRANSITIONS[from];
}

export function isTerminal(status: AppointmentStatus): boolean {
  return TRANSITIONS[status].length === 0;
}
