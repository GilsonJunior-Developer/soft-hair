export default function ClientesLoading() {
  return (
    <section className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <header className="flex flex-col gap-1">
        <div
          className="h-7 w-32 animate-pulse rounded"
          style={{ backgroundColor: 'var(--color-surface-hover)' }}
        />
        <div
          className="h-4 w-44 animate-pulse rounded"
          style={{ backgroundColor: 'var(--color-surface-hover)' }}
        />
      </header>
      <div className="flex flex-wrap gap-4">
        <div
          className="h-10 w-72 animate-pulse rounded-[var(--radius-md)]"
          style={{ backgroundColor: 'var(--color-surface-hover)' }}
        />
        <div
          className="h-10 w-44 animate-pulse rounded-[var(--radius-md)]"
          style={{ backgroundColor: 'var(--color-surface-hover)' }}
        />
      </div>
      <ul className="flex flex-col gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <li
            key={i}
            className="h-[78px] animate-pulse rounded-[var(--radius-lg)] border p-4"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-surface)',
            }}
          />
        ))}
      </ul>
      <span className="sr-only">Carregando clientes…</span>
    </section>
  );
}
