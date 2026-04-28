'use client';

import { useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SORT_LABELS, type SortKey } from './types';

const OPTIONS: SortKey[] = ['last_visit', 'name', 'visits', 'recent'];

export function ClientsSortSelect({ value }: { value: SortKey }) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const sp = new URLSearchParams(params.toString());
    const next = e.target.value as SortKey;
    if (next === 'last_visit') sp.delete('sort');
    else sp.set('sort', next);
    sp.delete('page');
    startTransition(() => {
      router.replace(`/clientes?${sp.toString()}`);
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="clients-sort" className="text-xs [color:var(--color-text-muted)]">
        Ordenar
      </label>
      <select
        id="clients-sort"
        value={value}
        onChange={onChange}
        className="h-10 rounded-[var(--radius-md)] border px-3 text-sm shadow-[var(--shadow-sm)] [background-color:var(--color-surface)] [color:var(--color-text-strong)] [border-color:var(--color-border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:[--tw-ring-color:var(--color-accent-500)]"
      >
        {OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {SORT_LABELS[opt]}
          </option>
        ))}
      </select>
    </div>
  );
}
