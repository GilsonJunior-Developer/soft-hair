import type { Metadata } from 'next';
import { LoginForm } from './login-form';

export const metadata: Metadata = {
  title: 'Entrar',
  description: 'Acesse sua conta SoftHair via link mágico por email.',
};

export default function LoginPage() {
  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-2 text-center">
        <h1
          className="text-2xl font-semibold"
          style={{ color: 'var(--color-text-strong)' }}
        >
          Entrar
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Enviaremos um link mágico para seu email — sem senhas.
        </p>
      </header>

      <LoginForm />
    </section>
  );
}
