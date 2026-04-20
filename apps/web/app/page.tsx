import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <div className="flex flex-col items-center gap-4">
        <span
          aria-hidden="true"
          className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-semibold text-white"
          style={{ backgroundColor: 'var(--color-accent-600)' }}
        >
          SH
        </span>
        <h1
          className="text-balance text-4xl leading-tight"
          style={{
            fontFamily: 'var(--font-display), serif',
            color: 'var(--color-text-strong)',
          }}
        >
          SoftHair
        </h1>
        <p
          className="text-balance text-base"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Gestão completa para salões de beleza pequeno-médios.
          <br />
          MVP em construção — <span className="font-medium">Story 1.1</span> done.
        </p>
      </div>

      <Link
        href="/api/healthz"
        className="inline-flex h-11 items-center justify-center rounded-[var(--radius-md)] px-6 text-sm font-medium text-white transition-colors hover:opacity-90"
        style={{ backgroundColor: 'var(--color-accent-600)' }}
      >
        Verificar /healthz →
      </Link>

      <footer
        className="mt-12 text-xs"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Roadmap em{' '}
        <code className="rounded bg-[var(--color-surface-hover)] px-1.5 py-0.5">
          docs/prd.md
        </code>
      </footer>
    </main>
  );
}
