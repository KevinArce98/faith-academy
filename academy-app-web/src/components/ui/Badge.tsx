import { type HTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

type BadgeVariant =
  | 'active'
  | 'expired'
  | 'review'
  | 'full'
  | 'waiting'
  | 'new'
  | 'streak'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'default';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
  count?: number;
}

const variantStyles: Record<BadgeVariant, string> = {
  active: 'bg-success/15 text-success border border-success/30',
  expired: 'bg-warning/15 text-warning border border-warning/30',
  review: 'bg-info/10 text-info border border-info/20',
  full: 'bg-gray-100 text-gray-600 border border-gray-100',
  waiting: 'bg-info text-white border border-info',
  new: 'bg-primary text-white border border-primary',
  streak: 'bg-dark text-white border border-dark',
  success: 'bg-success/15 text-success border border-success/30',
  warning: 'bg-warning/15 text-warning border border-warning/30',
  danger: 'bg-danger/15 text-danger border border-danger/30',
  info: 'bg-info/10 text-info border border-info/20',
  default: 'bg-gray-100 text-gray-600 border border-gray-100',
};

export function Badge({
  variant = 'default',
  dot,
  count,
  className,
  children,
  ...props
}: BadgeProps) {
  if (variant === 'streak') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
          variantStyles[variant],
          className
        )}
        {...props}
      >
        🔥 {count !== undefined ? `${count} días` : children}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {dot && <span className="text-[10px]">•</span>}
      {children}
    </span>
  );
}
