import Link from 'next/link';
import { ProfessionalForm } from '../professional-form';

export default function NovoProfissionalPage() {
  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <Link
          href="/profissionais"
          className="text-xs [color:var(--color-text-muted)] hover:underline"
        >
          ← Profissionais
        </Link>
        <h1 className="text-2xl font-semibold [color:var(--color-text-strong)]">
          Novo profissional
        </h1>
      </header>
      <ProfessionalForm mode="create" />
    </section>
  );
}
