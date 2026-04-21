'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Subscribe to realtime changes on public.appointments.
 * Invokes onChange() when any INSERT/UPDATE/DELETE happens within the
 * subscribed window, debounced to at most 1 call per 300ms.
 *
 * The caller is expected to call router.refresh() in onChange to fetch
 * the fresh window from the Server Component.
 */
export function useAgendaRealtime(enabled: boolean, onChange: () => void) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!enabled) return;
    const supabase = createClient();

    const trigger = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => onChangeRef.current(), 300);
    };

    const channel = supabase
      .channel('agenda-appointments')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        trigger,
      )
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [enabled]);
}
