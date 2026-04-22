import type { Metadata } from 'next';
import Link from 'next/link';
import { RecuperarSenhaForm } from './form';

export const metadata: Metadata = {
  title: 'Recuperar senha',
  description: 'Solicite um link para redefinir sua senha.',
};

export default function RecuperarSenhaPage() {
  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-2 text-center">
        <h1
          className="text-2xl font-semibold"
          style={{ color: 'var(--color-text-strong)' }}
        >
          Recuperar senha
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Informe seu email. Enviaremos um link para você criar uma senha nova.
        </p>
      </header>

      <RecuperarSenhaForm />

      <p className="text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
        Lembrou da senha?{' '}
        <Link
          href="/login"
          className="underline"
          style={{ color: 'var(--color-accent-700)' }}
        >
          Voltar para login
        </Link>
      </p>
    </section>
  );
}
