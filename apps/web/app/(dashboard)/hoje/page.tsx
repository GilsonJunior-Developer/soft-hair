import Link from 'next/link';

/**
 * Placeholder "Hoje" dashboard.
 * Full implementation in Story 1.7.
 */
export default function HojePage() {
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold [color:var(--color-text-strong)]">
        Hoje
      </h1>
      <p className="text-sm [color:var(--color-text-muted)]">
        🚧 Dashboard completo vem na Story 1.7. Por enquanto, você pode
        gerenciar{' '}
        <Link
          href="/profissionais"
          className="underline [color:var(--color-accent-600)]"
        >
          profissionais
        </Link>
        .
      </p>
    </section>
  );
}
