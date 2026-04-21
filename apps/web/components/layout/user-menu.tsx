'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut, User } from 'lucide-react';

export function UserMenu({
  email,
  salonName,
}: {
  email: string;
  salonName: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const initial = email.charAt(0).toUpperCase();

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu do usuário"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-[var(--radius-full)] p-1 pr-2 transition-colors hover:bg-[var(--color-surface-hover)]"
      >
        <span
          aria-hidden
          className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white"
          style={{ backgroundColor: 'var(--color-accent-600)' }}
        >
          {initial}
        </span>
        <ChevronDown
          className="h-4 w-4"
          aria-hidden
          style={{ color: 'var(--color-text-muted)' }}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-40 w-60 overflow-hidden rounded-[var(--radius-md)] border shadow-[var(--shadow-lg)]"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
          }}
        >
          <div
            className="flex items-start gap-3 border-b px-4 py-3"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <span
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
              style={{
                backgroundColor: 'var(--color-accent-50)',
                color: 'var(--color-accent-700)',
              }}
            >
              <User className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-sm font-medium"
                style={{ color: 'var(--color-text-strong)' }}
              >
                {salonName}
              </p>
              <p
                className="truncate text-xs"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {email}
              </p>
            </div>
          </div>
          <form action="/api/auth/logout" method="post">
            <button
              role="menuitem"
              type="submit"
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm transition-colors hover:bg-[var(--color-surface-hover)]"
              style={{ color: 'var(--color-text-base)' }}
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Sair
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
