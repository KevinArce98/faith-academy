import { type InputHTMLAttributes, forwardRef } from 'react';

import { cn } from '@/lib/cn';

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      type="checkbox"
      className={cn('accent-primary h-4 w-4 cursor-pointer rounded border-gray-300', className)}
      {...props}
    />
  )
);

Checkbox.displayName = 'Checkbox';
