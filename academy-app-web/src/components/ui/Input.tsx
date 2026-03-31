import { cn } from '@/lib/cn';
import { type InputHTMLAttributes, type ReactNode, forwardRef, useId } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  startIcon?: ReactNode;
  endAdornment?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, startIcon, endAdornment, className, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-label text-dark">
            {label}
          </label>
        )}

        <div className="relative">
          {startIcon && (
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray-400">
              {startIcon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            className={cn(
              // Base
              'text-dark h-11 w-full rounded-lg bg-white px-4 text-sm',
              'border border-gray-100 outline-none',
              'placeholder:text-gray-400',
              // Focus ring — raspberry
              'focus:border-primary focus:ring-primary/20 focus:ring-2',
              // Transition
              'transition-colors duration-150',
              startIcon && 'pl-9',
              (error || endAdornment) && 'pr-10',
              // Error state
              error &&
                'border-danger focus:border-danger focus:ring-danger/20',
              className
            )}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
            }
            {...props}
          />

          {/* Error icon */}
          {error && (
            <span
              aria-hidden="true"
              className="text-danger absolute top-1/2 right-3 -translate-y-1/2 text-base"
            >
              ⚠
            </span>
          )}

          {/* End adornment (e.g. unit labels) */}
          {!error && endAdornment && (
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-gray-400">
              {endAdornment}
            </span>
          )}
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

Input.displayName = 'Input';
