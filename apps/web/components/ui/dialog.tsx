'use client';

import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  maxWidthClass = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  maxWidthClass?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative flex w-full flex-col gap-4 rounded-t-[var(--radius-xl)] sm:rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-lg)] sm:m-4 ${maxWidthClass}`}
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        <header className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h2
              className="text-base font-semibold"
              style={{ color: 'var(--color-text-strong)' }}
            >
              {title}
            </h2>
            {description && (
              <p
                className="text-xs"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-[var(--radius-sm)] p-1 transition-colors hover:bg-[var(--color-surface-hover)]"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
