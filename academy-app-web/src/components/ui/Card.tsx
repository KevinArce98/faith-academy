import { cn } from '@/lib/cn';
import { type HTMLAttributes } from 'react';

type CardVariant = 'light' | 'dark' | 'outlined';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

const variantStyles: Record<CardVariant, string> = {
  light: 'bg-white border border-gray-100 shadow-sm',
  dark: 'bg-dark text-white border border-dark-mid',
  outlined: 'bg-white border border-gray-100',
};

export function Card({
  variant = 'light',
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn('rounded-2xl p-6', variantStyles[variant], className)}
      {...props}
    >
      {children}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

type CardHeaderProps = HTMLAttributes<HTMLDivElement>;
export function CardHeader({ className, children, ...props }: CardHeaderProps) {
  return (
    <div className={cn('mb-4', className)} {...props}>
      {children}
    </div>
  );
}

type CardTitleProps = HTMLAttributes<HTMLHeadingElement>;
export function CardTitle({ className, children, ...props }: CardTitleProps) {
  return (
    <h3 className={cn('text-heading-3', className)} {...props}>
      {children}
    </h3>
  );
}

type CardContentProps = HTMLAttributes<HTMLDivElement>;
export function CardContent({
  className,
  children,
  ...props
}: CardContentProps) {
  return (
    <div className={cn('text-body', className)} {...props}>
      {children}
    </div>
  );
}

type CardFooterProps = HTMLAttributes<HTMLDivElement>;
export function CardFooter({ className, children, ...props }: CardFooterProps) {
  return (
    <div className={cn('mt-4 flex items-center gap-3', className)} {...props}>
      {children}
    </div>
  );
}
