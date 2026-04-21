import { forwardRef, type SelectHTMLAttributes } from 'react';

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className = '', children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={`flex h-10 w-full rounded-[var(--radius-md)] border px-3 text-sm [background-color:var(--color-surface)] [color:var(--color-text-strong)] [border-color:var(--color-border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:[--tw-ring-color:var(--color-accent-500)] ${className}`}
      {...props}
    >
      {children}
    </select>
  );
});
