import { Sparkles } from 'lucide-react';

export function ComingSoon({
  title,
  description,
  etaLabel,
}: {
  title: string;
  description: string;
  etaLabel: string;
}) {
  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1
          className="text-2xl font-semibold"
          style={{ color: 'var(--color-text-strong)' }}
        >
          {title}
        </h1>
      </header>

      <div
        className="flex flex-col items-center justify-center gap-4 rounded-[var(--radius-lg)] border border-dashed px-6 py-16 text-center"
        style={{
          borderColor: 'var(--color-border-strong)',
          backgroundColor: 'var(--color-surface)',
        }}
      >
        <span
          className="flex h-12 w-12 items-center justify-center rounded-full"
          style={{
            backgroundColor: 'var(--color-accent-50)',
            color: 'var(--color-accent-700)',
          }}
        >
          <Sparkles className="h-5 w-5" aria-hidden />
        </span>
        <div className="flex flex-col gap-1">
          <p
            className="text-base font-semibold"
            style={{ color: 'var(--color-text-strong)' }}
          >
            Em breve
          </p>
          <p
            className="max-w-md text-sm"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {description}
          </p>
        </div>
        <span
          className="rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-wide"
          style={{
            backgroundColor: 'var(--color-accent-50)',
            color: 'var(--color-accent-700)',
          }}
        >
          {etaLabel}
        </span>
      </div>
    </section>
  );
}
