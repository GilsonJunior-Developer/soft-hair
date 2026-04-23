import Link from 'next/link';

export default function PublicProfessionalNotFound() {
  return (
    <main
      className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6 text-center"
    >
      <span
        aria-hidden="true"
        className="flex h-16 w-16 items-center justify-center rounded-full text-3xl"
        style={{
          backgroundColor: 'var(--color-accent-50)',
          color: 'var(--color-accent-600)',
        }}
      >
        ✂
      </span>
      <div className="flex flex-col gap-2">
        <h1
          className="text-xl font-semibold"
          style={{ color: 'var(--color-text-strong)' }}
        >
          Profissional não encontrado
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          O link que você usou pode estar errado ou o profissional não está
          mais disponível.
        </p>
      </div>
      <Link
        href="/"
        className="rounded-[var(--radius-md)] border px-4 py-2 text-sm"
        style={{
          borderColor: 'var(--color-border)',
          color: 'var(--color-text-strong)',
        }}
      >
        Voltar para o SoftHair
      </Link>
    </main>
  );
}
