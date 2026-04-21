import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12 [background-color:var(--color-bg)]">
      <div className="flex w-full max-w-md flex-col gap-6">
        <div className="flex items-center justify-center gap-3">
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
        </div>
        {children}
      </div>
    </div>
  );
}
