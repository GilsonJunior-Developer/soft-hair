import type { ReactNode } from 'react';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      {children}
    </div>
  );
}
