'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';

const DEBOUNCE_MS = 300;

export function ClientsSearch({ initial }: { initial: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(initial);
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function commit(next: string) {
    const sp = new URLSearchParams(params.toString());
    if (next.trim()) sp.set('q', next.trim());
    else sp.delete('q');
    sp.delete('page');
    startTransition(() => {
      router.replace(`/clientes?${sp.toString()}`);
    });
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => commit(next), DEBOUNCE_MS);
  }

  return (
    <div className="flex max-w-md flex-col gap-1">
      <label
        htmlFor="clients-search"
        className="text-xs [color:var(--color-text-muted)]"
      >
        Buscar por nome ou telefone
      </label>
      <Input
        id="clients-search"
        type="search"
        value={value}
        placeholder="Ex.: Maria · 11 98765-4321"
        onChange={onChange}
        autoComplete="off"
      />
    </div>
  );
}
