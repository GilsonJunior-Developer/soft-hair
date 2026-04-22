'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Subscribe to realtime changes on public.appointments.
 *
 * Callback is debounced to at most 1 call per 600ms AND deferred via
 * requestIdleCallback (or setTimeout fallback) so that Realtime pushes
 * never run on the critical input-response path. The caller should wrap
 * the refresh logic in React.startTransition for the same reason.
 */
type IdleCallback = (cb: () => void) => number;
const scheduleIdle: IdleCallback =
  typeof window !== 'undefined' && 'requestIdleCallback' in window
    ? (cb) =>
        (window as unknown as { requestIdleCallback: IdleCallback }).requestIdleCallback(cb)
    : (cb) => window.setTimeout(cb, 1);

export function useAgendaRealtime(enabled: boolean, onChange: () => void) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!enabled) return;
    const supabase = createClient();

    const trigger = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        scheduleIdle(() => onChangeRef.current());
      }, 600);
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
