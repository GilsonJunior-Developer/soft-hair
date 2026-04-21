import type { ReactNode } from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Guard: must be authenticated
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen flex-col [background-color:var(--color-bg)]">
      <header className="flex items-center justify-center gap-3 px-6 pt-12 pb-6">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 items-center justify-center rounded-full text-lg font-semibold text-white"
          style={{ backgroundColor: 'var(--color-accent-600)' }}
        >
          SH
        </span>
        <span
          className="text-2xl"
          style={{
            fontFamily: 'var(--font-display), serif',
            color: 'var(--color-text-strong)',
          }}
        >
          SoftHair
        </span>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-6 pb-12">
        {children}
      </main>
    </div>
  );
}
