import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { BottomNav } from '@/components/layout/bottom-nav';
import { UserMenu } from '@/components/layout/user-menu';

type MembershipRow = {
  salon_id: string;
  role: string;
  salons: { name: string; slug: string } | null;
};

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

  const { data: membership } = await supabase
    .from('salon_members')
    .select('salon_id, role, salons!inner(name, slug)')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle<MembershipRow>();

  if (!membership) {
    redirect('/onboarding');
  }

  const salonName = membership.salons?.name ?? 'Salão';
  const email = user.email ?? '';

  return (
    <div className="flex min-h-screen [background-color:var(--color-bg)]">
      <SidebarNav />

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="sticky top-0 z-30 flex h-14 items-center justify-between border-b px-4 lg:px-8"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
          }}
        >
          <div className="flex items-center gap-2 lg:hidden">
            <span
              aria-hidden
              className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white"
              style={{ backgroundColor: 'var(--color-accent-600)' }}
            >
              SH
            </span>
            <span
              className="text-sm font-medium"
              style={{ color: 'var(--color-text-strong)' }}
            >
              {salonName}
            </span>
          </div>

          <div className="hidden lg:block">
            <span
              className="text-sm"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {salonName}
            </span>
          </div>

          <UserMenu email={email} salonName={salonName} />
        </header>

        <main className="flex-1 px-4 py-6 pb-24 lg:px-8 lg:py-8 lg:pb-8">
          <div className="mx-auto w-full max-w-[1280px]">{children}</div>
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
