'use client';

import { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { sendMagicLink } from '../login/actions';

const COOLDOWN_SECONDS = 60;

export function ResendButton({ email }: { email: string }) {
  const [secondsLeft, setSecondsLeft] = useState(COOLDOWN_SECONDS);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  function onResend() {
    if (!email || secondsLeft > 0 || isPending) return;

    setMessage(null);
    const formData = new FormData();
    formData.set('email', email);

    startTransition(async () => {
      const res = await sendMagicLink(formData);
      if (res.ok === false) {
        setMessage(res.error);
      } else {
        setMessage('Link reenviado. Verifique seu email.');
        setSecondsLeft(COOLDOWN_SECONDS);
      }
    });
  }

  const disabled = !email || secondsLeft > 0 || isPending;
  const label =
    secondsLeft > 0
      ? `Reenviar em ${secondsLeft}s`
      : isPending
        ? 'Reenviando...'
        : 'Reenviar link';

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="secondary"
        size="lg"
        onClick={onResend}
        disabled={disabled}
      >
        {label}
      </Button>
      {message && (
        <p
          role="status"
          className="text-center text-xs"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {message}
        </p>
      )}
    </div>
  );
}
