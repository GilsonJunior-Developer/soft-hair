import { memo } from 'react';
import { STATUS_LABELS, type AppointmentStatus } from '@/lib/appointment-state';

const STYLES: Record<AppointmentStatus, { bg: string; fg: string }> = {
  PENDING_CONFIRMATION: {
    bg: 'var(--color-status-pending)',
    fg: '#78350f',
  },
  CONFIRMED: {
    bg: 'var(--color-status-confirmed)',
    fg: '#064e3b',
  },
  COMPLETED: {
    bg: 'var(--color-status-completed)',
    fg: '#ffffff',
  },
  NO_SHOW: {
    bg: 'var(--color-status-no-show)',
    fg: '#ffffff',
  },
  CANCELED: {
    bg: 'var(--color-status-canceled)',
    fg: '#ffffff',
  },
};

function StatusBadgeImpl({
  status,
  size = 'sm',
}: {
  status: AppointmentStatus;
  size?: 'xs' | 'sm' | 'md';
}) {
  const style = STYLES[status];
  const sizeClass =
    size === 'xs'
      ? 'px-1.5 py-0.5 text-[10px]'
      : size === 'md'
        ? 'px-3 py-1 text-sm'
        : 'px-2 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeClass}`}
      style={{ backgroundColor: style.bg, color: style.fg }}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export const StatusBadge = memo(StatusBadgeImpl);
