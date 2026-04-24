'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

type Props = {
  title: string;
  text: string;
};

type Status = 'idle' | 'shared' | 'copied' | 'failed';

export function ShareButton({ title, text }: Props) {
  const [status, setStatus] = useState<Status>('idle');

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';

    const nav = typeof navigator !== 'undefined' ? navigator : null;
    if (nav?.share) {
      try {
        await nav.share({ title, text, url });
        setStatus('shared');
        return;
      } catch (err) {
        if ((err as DOMException)?.name === 'AbortError') {
          return;
        }
      }
    }

    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setStatus('copied');
      setTimeout(() => setStatus('idle'), 2500);
    } catch {
      setStatus('failed');
      setTimeout(() => setStatus('idle'), 2500);
    }
  };

  const label =
    status === 'shared'
      ? 'Compartilhado ✓'
      : status === 'copied'
        ? 'Link copiado ✓'
        : status === 'failed'
          ? 'Não foi possível compartilhar'
          : 'Compartilhar';

  return (
    <Button
      type="button"
      onClick={handleShare}
      variant="primary"
      size="lg"
      aria-live="polite"
    >
      {label}
    </Button>
  );
}
