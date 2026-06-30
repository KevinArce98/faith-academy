import { type TextareaHTMLAttributes, forwardRef, useId } from 'react';

import { cn } from '@/lib/cn';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id ?? generatedId;

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={textareaId} className="text-label text-dark">
            {label}
          </label>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            'text-dark w-full resize-none rounded-lg bg-white px-4 py-3 text-sm',
            'border border-gray-100 outline-none',
            'placeholder:text-gray-400',
            'focus:border-primary focus:ring-primary/20 focus:ring-2',
            'transition-colors duration-150',
            error && 'border-danger focus:border-danger focus:ring-danger/20',
            className
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined}
          {...props}
        />

        {error && (
          <p id={`${textareaId}-error`} className="text-caption text-danger">
            {error}
          </p>
        )}

        {!error && hint && (
          <p id={`${textareaId}-hint`} className="text-caption text-gray-400">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
