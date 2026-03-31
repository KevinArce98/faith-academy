import { cn } from '@/lib/cn';
import { type ButtonHTMLAttributes, forwardRef } from 'react';

// ─── Variant ────────────────────────────────────────────────────────────────
// contained  → filled background
// outlined   → transparent bg with colored border
// text       → no bg, no border (link-like)
// icon       → square, icon-only

export type ButtonVariant = 'contained' | 'outlined' | 'text' | 'icon';

// ─── Color ───────────────────────────────────────────────────────────────────
export type ButtonColor =
  | 'primary'
  | 'dark'
  | 'danger'
  | 'success'
  | 'warning'
  | 'neutral';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  color?: ButtonColor;
  size?: ButtonSize;
}

// ─── Explicit style matrix (variant × color) ─────────────────────────────────
// All class names must be full strings — Tailwind JIT cannot detect dynamic ones.

const styles: Record<ButtonVariant, Record<ButtonColor, string>> = {
  // ── contained: filled bg, white text ──────────────────────────────────────
  contained: {
    primary:
      'bg-primary      text-white border border-primary      hover:bg-primary-light  hover:border-primary-light  active:bg-primary-dark  active:border-primary-dark',
    dark:
      'bg-dark         text-white border border-dark         hover:bg-dark-mid       hover:border-dark-mid       active:bg-gray-900',
    danger:
      'bg-danger       text-white border border-danger       hover:bg-danger/80      hover:border-danger/80      active:bg-danger/70',
    success:
      'bg-success      text-white border border-success      hover:bg-success/80     hover:border-success/80     active:bg-success/70',
    warning:
      'bg-warning      text-white border border-warning      hover:bg-warning/80     hover:border-warning/80     active:bg-warning/70',
    neutral:
      'bg-gray-100     text-dark  border border-gray-100     hover:bg-gray-200       hover:border-gray-200       active:bg-gray-300',
  },

  // ── outlined: transparent bg, colored border + text ───────────────────────
  outlined: {
    primary:
      'bg-transparent  text-primary border border-primary    hover:bg-primary/10     active:bg-primary/20',
    dark:
      'bg-transparent  text-dark    border border-dark       hover:bg-dark/10        active:bg-dark/20',
    danger:
      'bg-transparent  text-danger  border border-danger     hover:bg-danger/10      active:bg-danger/20',
    success:
      'bg-transparent  text-success border border-success    hover:bg-success/10     active:bg-success/20',
    warning:
      'bg-transparent  text-warning border border-warning    hover:bg-warning/10     active:bg-warning/20',
    neutral:
      'bg-transparent  text-gray-600 border border-gray-300  hover:bg-gray-100       active:bg-gray-200',
  },

  // ── text: no bg, no border — hover shows a tinted bg wash ─────────────────
  text: {
    primary:
      'bg-transparent  text-primary border border-transparent hover:bg-primary/10    active:bg-primary/20',
    dark:
      'bg-transparent  text-dark    border border-transparent hover:bg-dark/10       active:bg-dark/20',
    danger:
      'bg-transparent  text-danger  border border-transparent hover:bg-danger/10     active:bg-danger/20',
    success:
      'bg-transparent  text-success border border-transparent hover:bg-success/10    active:bg-success/20',
    warning:
      'bg-transparent  text-warning border border-transparent hover:bg-warning/10    active:bg-warning/20',
    neutral:
      'bg-transparent  text-gray-600 border border-transparent hover:bg-gray-100     active:bg-gray-200',
  },

  // ── icon: square, same hover logic as text ────────────────────────────────
  icon: {
    primary:
      'bg-transparent  text-primary border border-transparent hover:bg-primary/10    active:bg-primary/20',
    dark:
      'bg-transparent  text-dark    border border-transparent hover:bg-dark/10       active:bg-dark/20',
    danger:
      'bg-transparent  text-danger  border border-transparent hover:bg-danger/10     active:bg-danger/20',
    success:
      'bg-transparent  text-success border border-transparent hover:bg-success/10    active:bg-success/20',
    warning:
      'bg-transparent  text-warning border border-transparent hover:bg-warning/10    active:bg-warning/20',
    neutral:
      'bg-transparent  text-gray-600 border border-transparent hover:bg-gray-100     active:bg-gray-200',
  },
};

// ─── Focus ring per color ─────────────────────────────────────────────────────
const ringStyles: Record<ButtonColor, string> = {
  primary: 'focus-visible:ring-primary',
  dark:    'focus-visible:ring-dark',
  danger:  'focus-visible:ring-danger',
  success: 'focus-visible:ring-success',
  warning: 'focus-visible:ring-warning',
  neutral: 'focus-visible:ring-gray-400',
};

// ─── Size ────────────────────────────────────────────────────────────────────
const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-5 text-sm',
  lg: 'h-12 px-6 text-base',
};

const iconSizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
};

// ─── Component ───────────────────────────────────────────────────────────────
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'contained',
      color = 'primary',
      size = 'md',
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const isIcon = variant === 'icon';

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg font-semibold',
          'cursor-pointer transition-all duration-150 select-none',
          'active:scale-[0.97]',
          'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
          'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
          ringStyles[color],
          styles[variant][color],
          isIcon ? iconSizeStyles[size] : sizeStyles[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
