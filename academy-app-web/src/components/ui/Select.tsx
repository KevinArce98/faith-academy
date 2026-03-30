import { cn } from '@/lib/cn';
import { ChevronDown } from 'lucide-react';
import { SelectHTMLAttributes, forwardRef, useId } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, className, id, children, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={selectId} className="text-label text-dark">
            {label}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              'text-dark h-11 w-full appearance-none rounded-lg bg-white px-4 pr-9 text-sm',
              'border border-gray-100 outline-none',
              'focus:border-primary focus:ring-primary/20 focus:ring-2',
              'transition-colors duration-150',
              error && 'border-danger focus:border-danger focus:ring-danger/20',
              className
            )}
            aria-invalid={!!error}
            aria-describedby={
              error
                ? `${selectId}-error`
                : hint
                  ? `${selectId}-hint`
                  : undefined
            }
            {...props}
          >
            {children}
          </select>

          <ChevronDown
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-gray-400',
              error && 'right-8'
            )}
          />

          {error && (
            <span
              aria-hidden="true"
              className="text-danger absolute top-1/2 right-3 -translate-y-1/2 text-base"
            >
              ⚠
            </span>
          )}
        </div>

        {error && (
          <p id={`${selectId}-error`} className="text-caption text-danger">
            {error}
          </p>
        )}

        {!error && hint && (
          <p id={`${selectId}-hint`} className="text-caption text-gray-400">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
