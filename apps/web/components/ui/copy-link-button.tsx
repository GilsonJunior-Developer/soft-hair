'use client';

import { useCallback, useState } from 'react';
import { Button } from './button';

type Props = {
  /** Absolute path (e.g. `/salon-slug/prof-slug`). Origin is prepended at copy time. */
  path: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'ghost';
};

const COPIED_RESET_MS = 2000;

export function CopyLinkButton({
  path,
  label = 'Copiar link',
  size = 'sm',
  variant = 'secondary',
}: Props) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  const handleCopy = useCallback(async () => {
    const absoluteUrl =
      typeof window !== 'undefined' ? `${window.location.origin}${path}` : path;

    let ok = false;

    // Prefer modern Clipboard API.
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(absoluteUrl);
        ok = true;
      } catch {
        // Fall through to execCommand fallback.
      }
    }

    // Fallback for browsers without Clipboard API (or blocked by permissions).
    if (!ok && typeof document !== 'undefined') {
      const textarea = document.createElement('textarea');
      textarea.value = absoluteUrl;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      textarea.setAttribute('readonly', '');
      document.body.appendChild(textarea);
      textarea.select();
      try {
        ok = document.execCommand('copy');
      } catch {
        ok = false;
      }
      document.body.removeChild(textarea);
    }

    if (ok) {
      setCopied(true);
      setFailed(false);
      window.setTimeout(() => setCopied(false), COPIED_RESET_MS);
    } else {
      setFailed(true);
      window.setTimeout(() => setFailed(false), COPIED_RESET_MS);
    }
  }, [path]);

  const buttonLabel = failed ? 'Erro ao copiar' : copied ? '✓ Copiado!' : label;

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleCopy}
      aria-live="polite"
    >
      {buttonLabel}
    </Button>
  );
}
