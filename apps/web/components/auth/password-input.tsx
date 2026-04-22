'use client';

import { forwardRef, useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';

type PasswordInputProps = InputHTMLAttributes<HTMLInputElement> & {
  toggleLabelShow?: string;
  toggleLabelHide?: string;
};

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput(
    {
      toggleLabelShow = 'Mostrar senha',
      toggleLabelHide = 'Ocultar senha',
      className = '',
      ...props
    },
    ref,
  ) {
    const [visible, setVisible] = useState(false);

    return (
      <div className="relative">
        <Input
          ref={ref}
          type={visible ? 'text' : 'password'}
          autoComplete={props.autoComplete ?? 'current-password'}
          className={`pr-10 ${className}`}
          {...props}
        />
        <button
          type="button"
          aria-label={visible ? toggleLabelHide : toggleLabelShow}
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-sm"
          style={{ color: 'var(--color-text-muted)' }}
          tabIndex={-1}
        >
          {visible ? (
            <EyeOff className="h-4 w-4" aria-hidden />
          ) : (
            <Eye className="h-4 w-4" aria-hidden />
          )}
        </button>
      </div>
    );
  },
);
