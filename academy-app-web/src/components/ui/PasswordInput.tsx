import { Eye, EyeOff } from 'lucide-react';
import { type InputHTMLAttributes, forwardRef, useId, useState } from 'react';

import { cn } from '@/lib/cn';

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  hint?: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const [show, setShow] = useState(false);

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-label text-dark">
            {label}
          </label>
        )}

        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={show ? 'text' : 'password'}
            className={cn(
              'text-dark h-11 w-full rounded-lg bg-white px-4 pr-10 text-sm',
              'border border-gray-100 outline-none',
              'placeholder:text-gray-400',
              'focus:border-primary focus:ring-primary/20 focus:ring-2',
              'transition-colors duration-150',
              error && 'border-danger focus:border-danger focus:ring-danger/20',
              className
            )}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...props}
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {show ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
        </div>

        {error && (
          <p id={`${inputId}-error`} className="text-caption text-danger">
            {error}
          </p>
        )}

        {!error && hint && (
          <p id={`${inputId}-hint`} className="text-caption text-gray-400">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';
