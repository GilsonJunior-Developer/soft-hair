'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from './nav-items';

export function SidebarNav() {
  const pathname = usePathname() ?? '';

  return (
    <nav
      aria-label="Navegação principal"
      className="hidden h-full w-60 shrink-0 flex-col gap-1 border-r px-3 py-6 lg:flex"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="px-3 pb-4">
        <span
          className="font-[family-name:var(--font-display)] text-xl font-semibold"
          style={{ color: 'var(--color-text-strong)' }}
        >
          SoftHair
        </span>
      </div>

      <ul className="flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className="group relative flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--color-surface-hover)]"
                style={{
                  color: isActive
                    ? 'var(--color-accent-700)'
                    : 'var(--color-text-base)',
                  backgroundColor: isActive
                    ? 'var(--color-accent-50)'
                    : 'transparent',
                }}
              >
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full"
                    style={{ backgroundColor: 'var(--color-accent-600)' }}
                  />
                )}
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                <span className="flex-1">{item.label}</span>
                {item.comingSoon && (
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide"
                    style={{
                      backgroundColor: 'var(--color-border)',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    Em breve
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
