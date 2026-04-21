'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { BOTTOM_NAV_ITEMS, NAV_ITEMS } from './nav-items';
import { useState } from 'react';

export function BottomNav() {
  const pathname = usePathname() ?? '';
  const [sheetOpen, setSheetOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <nav
        aria-label="Navegação inferior"
        className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch border-t lg:hidden"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          paddingBottom: 'env(safe-area-inset-bottom, 0)',
        }}
      >
        {BOTTOM_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className="flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium"
              style={{
                color: active
                  ? 'var(--color-accent-700)'
                  : 'var(--color-text-muted)',
              }}
            >
              <Icon
                className="h-5 w-5"
                aria-hidden
                strokeWidth={active ? 2.5 : 2}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-label="Abrir mais opções"
          aria-expanded={sheetOpen}
          className="flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <Menu className="h-5 w-5" aria-hidden />
          <span>Mais</span>
        </button>
      </nav>

      {sheetOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
        >
          <button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 bg-black/50"
            onClick={() => setSheetOpen(false)}
          />
          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-[var(--radius-xl)] p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0))]"
            style={{ backgroundColor: 'var(--color-surface)' }}
          >
            <div
              className="mx-auto mb-4 h-1 w-10 rounded-full"
              style={{ backgroundColor: 'var(--color-border-strong)' }}
              aria-hidden
            />
            <ul className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setSheetOpen(false)}
                      className="flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-3 text-sm font-medium"
                      style={{
                        color: active
                          ? 'var(--color-accent-700)'
                          : 'var(--color-text-base)',
                        backgroundColor: active
                          ? 'var(--color-accent-50)'
                          : 'transparent',
                      }}
                    >
                      <Icon className="h-5 w-5 shrink-0" aria-hidden />
                      <span className="flex-1">{item.label}</span>
                      {item.comingSoon && (
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide"
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
          </div>
        </div>
      )}
    </>
  );
}
