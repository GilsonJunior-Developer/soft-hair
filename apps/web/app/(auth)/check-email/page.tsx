import type { Metadata } from 'next';
import Link from 'next/link';
import { ResendButton } from './resend-button';

export const metadata: Metadata = {
  title: 'Verifique seu email',
};

type SearchParams = Promise<{ e?: string }>;

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { e } = await searchParams;
  const email = e ? decodeURIComponent(e) : '';

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col items-center gap-3 text-center">
        <span
          aria-hidden="true"
          className="flex h-14 w-14 items-center justify-center rounded-full text-2xl"
          style={{
            backgroundColor: 'var(--color-accent-50)',
            color: 'var(--color-accent-600)',
          }}
        >
          ✉
        </span>
        <h1
          className="text-2xl font-semibold"
          style={{ color: 'var(--color-text-strong)' }}
        >
          Verifique seu email
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Enviamos um link mágico para{' '}
          {email ? (
            <strong style={{ color: 'var(--color-text-strong)' }}>
              {email}
            </strong>
          ) : (
            'seu email'
          )}
          . Abra seu email e click no link para entrar.
        </p>
      </header>

      <div className="flex flex-col gap-3">
        <ResendButton email={email} />
        <Link
          href="/login"
          className="text-center text-sm underline transition-opacity hover:opacity-70"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Usar outro email
        </Link>
      </div>

      <p
        className="text-balance text-center text-xs"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Não viu o email? Verifique sua caixa de spam. Links expiram em 1h.
      </p>
    </section>
  );
}
