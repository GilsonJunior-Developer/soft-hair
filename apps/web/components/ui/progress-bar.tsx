import { cn } from '@/lib/utils';

export function ProgressBar({
  current,
  total,
  className,
}: {
  current: number;
  total: number;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (current / total) * 100));
  return (
    <div
      className={cn('flex flex-col gap-2', className)}
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-label={`Passo ${current} de ${total}`}
    >
      <div className="flex items-center justify-between text-xs [color:var(--color-text-muted)]">
        <span>
          Passo {current} de {total}
        </span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full"
        style={{ backgroundColor: 'var(--color-surface-hover)' }}
      >
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{
            width: `${pct}%`,
            backgroundColor: 'var(--color-accent-600)',
          }}
        />
      </div>
    </div>
  );
}
