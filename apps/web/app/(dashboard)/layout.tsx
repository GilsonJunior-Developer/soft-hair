import type { ReactNode } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * Minimal dashboard layout.
 * Full sidebar/bottom-nav organism comes in Story 1.7.
 * For now: auth guard + simple header with logo + logout.
 */
export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check salon membership — if none, onboarding wasn't completed
  const { data: membership } = await supabase
    .from('salon_members')
    .select('salon_id, role, salons!inner(name, slug)')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    redirect('/onboarding');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const salonName = (membership as any).salons?.name ?? 'Salão';

  return (
    <div className="flex min-h-screen flex-col [background-color:var(--color-bg)]">
      <header
        className="flex items-center justify-between border-b px-6 py-4"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-surface)',
        }}
      >
        <Link
          href="/hoje"
          className="flex items-center gap-2 transition-opacity hover:opacity-80"
        >
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-white"
            style={{ backgroundColor: 'var(--color-accent-600)' }}
          >
            SH
          </span>
          <span className="text-sm font-medium [color:var(--color-text-strong)]">
            {salonName}
          </span>
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          <Link href="/hoje" className="[color:var(--color-text-muted)] hover:[color:var(--color-text-strong)]">
            Hoje
          </Link>
          <Link href="/profissionais" className="[color:var(--color-text-muted)] hover:[color:var(--color-text-strong)]">
            Profissionais
          </Link>
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="text-xs underline [color:var(--color-text-muted)] hover:[color:var(--color-text-strong)]"
            >
              Sair
            </button>
          </form>
        </nav>
      </header>

      <main className="flex-1 px-6 py-8">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
