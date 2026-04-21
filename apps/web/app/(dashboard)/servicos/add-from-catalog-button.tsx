'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { addServicesFromCatalog } from './actions';
import { CATEGORY_LABELS, formatPrice } from './types';
import { createClient } from '@/lib/supabase/client';

type CatalogRow = {
  id: string;
  name: string;
  category: string;
  default_duration_minutes: number;
  suggested_price_brl: number;
};

export function AddFromCatalogButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [available, setAvailable] = useState<CatalogRow[]>([]);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    async function load() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) setError('Sessão expirada');
          return;
        }
        const { data: me } = await supabase
          .from('users')
          .select('default_salon_id')
          .eq('id', user.id)
          .maybeSingle();
        const salonId = me?.default_salon_id;
        if (!salonId) {
          if (!cancelled) setError('Salão não encontrado');
          return;
        }

        const { data: already } = await supabase
          .from('services')
          .select('catalog_id')
          .eq('salon_id', salonId)
          .not('catalog_id', 'is', null)
          .is('deleted_at', null);
        const alreadyIds = new Set(
          (already ?? []).map((r) => r.catalog_id).filter(Boolean) as string[],
        );

        const { data: catalog } = await supabase
          .from('service_catalog')
          .select(
            'id, name, category, default_duration_minutes, suggested_price_brl',
          )
          .order('category', { ascending: true })
          .order('name', { ascending: true });

        if (cancelled) return;
        const filtered = (catalog ?? []).filter((c) => !alreadyIds.has(c.id));
        setAvailable(
          filtered.map((c) => ({
            id: c.id,
            name: c.name,
            category: c.category,
            default_duration_minutes: c.default_duration_minutes,
            suggested_price_brl: Number(c.suggested_price_brl),
          })),
        );
      } catch {
        if (!cancelled) setError('Erro ao carregar catálogo');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [open]);

  function toggle(id: string, suggestedPrice: number) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[id] !== undefined) {
        delete next[id];
      } else {
        next[id] = formatPrice(suggestedPrice);
      }
      return next;
    });
  }

  function setPrice(id: string, raw: string) {
    setSelected((prev) => ({ ...prev, [id]: raw }));
  }

  function onSubmit() {
    setError(null);
    const entries: Array<{ catalogId: string; priceBrl: number }> = [];
    for (const [catalogId, raw] of Object.entries(selected)) {
      const normalized = raw.replace(/\./g, '').replace(',', '.');
      const priceBrl = Number(normalized);
      if (!Number.isFinite(priceBrl) || priceBrl < 0) {
        const svc = available.find((a) => a.id === catalogId);
        setError(`Preço inválido para ${svc?.name}`);
        return;
      }
      entries.push({ catalogId, priceBrl });
    }
    if (entries.length === 0) {
      setOpen(false);
      return;
    }

    startTransition(async () => {
      const res = await addServicesFromCatalog(entries);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpen(false);
      setSelected({});
      router.refresh();
    });
  }

  // Group by category
  const grouped = available.reduce<Record<string, CatalogRow[]>>((acc, c) => {
    (acc[c.category] ??= []).push(c);
    return acc;
  }, {});

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        + Do catálogo
      </Button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Adicionar serviços do catálogo"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-2xl flex-col gap-4 overflow-hidden rounded-t-[var(--radius-xl)] p-6 sm:rounded-[var(--radius-xl)]"
            style={{ backgroundColor: 'var(--color-surface)' }}
          >
            <header className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold [color:var(--color-text-strong)]">
                  Adicionar do catálogo
                </h2>
                <p className="mt-1 text-sm [color:var(--color-text-muted)]">
                  Selecione serviços e ajuste os preços. Você pode editar depois.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-2xl leading-none [color:var(--color-text-muted)] hover:[color:var(--color-text-strong)]"
                aria-label="Fechar"
              >
                ×
              </button>
            </header>

            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <p className="text-sm [color:var(--color-text-muted)]">
                  Carregando catálogo...
                </p>
              ) : available.length === 0 ? (
                <p className="text-sm [color:var(--color-text-muted)]">
                  Todos os serviços do catálogo já estão no seu salão. Crie um
                  serviço personalizado se precisar.
                </p>
              ) : (
                <div className="flex flex-col gap-4">
                  {Object.entries(grouped).map(([cat, items]) => (
                    <div key={cat} className="flex flex-col gap-2">
                      <h3 className="text-xs font-medium uppercase tracking-wide [color:var(--color-text-muted)]">
                        {CATEGORY_LABELS[cat] ?? cat}
                      </h3>
                      <ul className="flex flex-col gap-2">
                        {items.map((c) => {
                          const isSelected = selected[c.id] !== undefined;
                          return (
                            <li
                              key={c.id}
                              className="flex items-center gap-3 rounded-[var(--radius-md)] border p-3 transition-colors"
                              style={{
                                borderColor: isSelected
                                  ? 'var(--color-accent-600)'
                                  : 'var(--color-border)',
                                backgroundColor: isSelected
                                  ? 'var(--color-accent-50)'
                                  : 'var(--color-surface)',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() =>
                                  toggle(c.id, c.suggested_price_brl)
                                }
                                className="h-4 w-4 cursor-pointer"
                                style={{
                                  accentColor: 'var(--color-accent-600)',
                                }}
                                aria-label={`Selecionar ${c.name}`}
                              />
                              <div className="flex flex-1 flex-col">
                                <span className="text-sm font-medium [color:var(--color-text-strong)]">
                                  {c.name}
                                </span>
                                <span className="text-xs [color:var(--color-text-muted)]">
                                  {c.default_duration_minutes} min · sugestão R$
                                  {' '}
                                  {formatPrice(c.suggested_price_brl)}
                                </span>
                              </div>
                              {isSelected && (
                                <div className="flex items-center gap-1">
                                  <span className="text-sm [color:var(--color-text-muted)]">
                                    R$
                                  </span>
                                  <Input
                                    type="text"
                                    inputMode="decimal"
                                    value={selected[c.id]}
                                    onChange={(e) => setPrice(c.id, e.target.value)}
                                    className="h-9 w-24 text-right"
                                    aria-label={`Preço de ${c.name}`}
                                  />
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-[var(--radius-md)] p-3 text-sm"
                style={{
                  backgroundColor: 'var(--color-error-bg)',
                  color: 'var(--color-error)',
                }}
              >
                {error}
              </div>
            )}

            <footer className="flex items-center justify-between gap-3 border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
              <span className="text-xs [color:var(--color-text-muted)]">
                {Object.keys(selected).length} selecionados
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                  disabled={isPending}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={onSubmit}
                  disabled={isPending || Object.keys(selected).length === 0}
                >
                  {isPending ? 'Adicionando...' : 'Adicionar selecionados'}
                </Button>
              </div>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
