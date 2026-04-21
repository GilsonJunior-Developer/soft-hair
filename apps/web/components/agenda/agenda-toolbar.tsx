'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  formatAnchor,
  parseAnchor,
  shiftAnchor,
  type AgendaView,
} from '@/lib/agenda/date-range';
import type { AgendaProfessional } from '@/app/(dashboard)/agenda/actions';

const VIEW_LABELS: Record<AgendaView, string> = {
  day: 'Dia',
  week: 'Semana',
  month: 'Mês',
};

export function AgendaToolbar({
  view,
  anchor,
  professionalId,
  professionals,
  onNewClick,
}: {
  view: AgendaView;
  anchor: string;
  professionalId: string | null;
  professionals: AgendaProfessional[];
  onNewClick: () => void;
}) {
  const router = useRouter();

  const updateParams = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams();
      const current = { view, date: anchor, professional: professionalId ?? 'all' };
      const merged = { ...current, ...patch };
      for (const [k, v] of Object.entries(merged)) {
        if (v !== null && v !== undefined && v !== '') params.set(k, v);
      }
      router.replace(`/agenda?${params.toString()}`, { scroll: false });
    },
    [router, view, anchor, professionalId],
  );

  const shift = (delta: -1 | 1) => {
    const next = shiftAnchor(view, parseAnchor(anchor), delta);
    updateParams({ date: formatAnchor(next) });
  };

  const goToday = () => {
    updateParams({ date: formatAnchor(new Date()) });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        className="inline-flex rounded-[var(--radius-md)] border p-0.5"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-surface)',
        }}
        role="radiogroup"
        aria-label="Modo de visualização"
      >
        {(Object.keys(VIEW_LABELS) as AgendaView[]).map((v) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={v === view}
            onClick={() => updateParams({ view: v })}
            className="rounded-[var(--radius-sm)] px-3 py-1 text-sm font-medium transition-colors"
            style={{
              backgroundColor:
                v === view ? 'var(--color-accent-600)' : 'transparent',
              color:
                v === view ? '#ffffff' : 'var(--color-text-base)',
            }}
          >
            {VIEW_LABELS[v]}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Período anterior"
          onClick={() => shift(-1)}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={goToday}>
          Hoje
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Próximo período"
          onClick={() => shift(1)}
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <span style={{ color: 'var(--color-text-muted)' }}>Profissional</span>
        <select
          value={professionalId ?? 'all'}
          onChange={(e) =>
            updateParams({
              professional: e.target.value === 'all' ? 'all' : e.target.value,
            })
          }
          className="h-9 rounded-[var(--radius-md)] border px-2 text-sm [background-color:var(--color-surface)] [color:var(--color-text-strong)] [border-color:var(--color-border-strong)]"
        >
          <option value="all">Todos</option>
          {professionals.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

      <div className="ml-auto">
        <Button type="button" size="sm" onClick={onNewClick}>
          <Plus className="mr-1 h-4 w-4" aria-hidden />
          Novo agendamento
        </Button>
      </div>
    </div>
  );
}
