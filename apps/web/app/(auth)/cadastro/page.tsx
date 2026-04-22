import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SignupForm } from './signup-form';

export const metadata: Metadata = {
  title: 'Criar conta',
  description: 'Cadastre seu salão no SoftHair.',
};

export default async function CadastroPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect('/hoje');

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-2 text-center">
        <h1
          className="text-2xl font-semibold"
          style={{ color: 'var(--color-text-strong)' }}
        >
          Criar conta
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Cadastre seu email e defina uma senha. Em seguida você configura seu salão.
        </p>
      </header>

      <SignupForm />
    </section>
  );
}
