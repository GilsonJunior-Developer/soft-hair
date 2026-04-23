import type { Metadata } from 'next';
import { NovaSenhaForm } from './form';

export const metadata: Metadata = {
  title: 'Nova senha',
  description: 'Defina uma nova senha para sua conta.',
};

export default function NovaSenhaPage() {
  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-2 text-center">
        <h1
          className="text-2xl font-semibold"
          style={{ color: 'var(--color-text-strong)' }}
        >
          Nova senha
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Crie uma senha segura. Você usará ela para acessar o SoftHair daqui em diante.
        </p>
      </header>

      <NovaSenhaForm />
    </section>
  );
}
