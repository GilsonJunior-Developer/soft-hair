import Link from 'next/link';
import { ServiceForm } from '../service-form';

export default function NovoServicoPage() {
  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <Link
          href="/servicos"
          className="text-xs [color:var(--color-text-muted)] hover:underline"
        >
          ← Serviços
        </Link>
        <h1 className="text-2xl font-semibold [color:var(--color-text-strong)]">
          Novo serviço personalizado
        </h1>
        <p className="text-sm [color:var(--color-text-muted)]">
          Crie um serviço que não está no catálogo padrão.
        </p>
      </header>
      <ServiceForm mode="create" />
    </section>
  );
}
