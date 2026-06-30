import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';
import { cn } from '@/utils/cn';

type Variant = 'contained' | 'outlined' | 'ghost';
type Color = 'primary' | 'success' | 'danger' | 'neutral';
type Size = 'sm' | 'md' | 'lg';

const containerCls: Record<Variant, Record<Color, string>> = {
  contained: {
    primary: 'bg-primary border border-primary',
    success: 'bg-success border border-success',
    danger: 'bg-danger border border-danger',
    neutral: 'bg-gray-100 border border-gray-100',
  },
  outlined: {
    primary: 'bg-transparent border border-primary',
    success: 'bg-transparent border border-success',
    danger: 'bg-transparent border border-danger',
    neutral: 'bg-transparent border border-gray-300',
  },
  ghost: {
    primary: 'bg-transparent border border-transparent',
    success: 'bg-transparent border border-transparent',
    danger: 'bg-transparent border border-transparent',
    neutral: 'bg-transparent border border-transparent',
  },
};

const textCls: Record<Variant, Record<Color, string>> = {
  contained: {
    primary: 'text-white',
    success: 'text-white',
    danger: 'text-white',
    neutral: 'text-dark',
  },
  outlined: {
    primary: 'text-primary',
    success: 'text-success',
    danger: 'text-danger',
    neutral: 'text-dark',
  },
  ghost: {
    primary: 'text-primary',
    success: 'text-success',
    danger: 'text-danger',
    neutral: 'text-dark',
  },
};

const sizeCls: Record<Size, string> = {
  sm: 'px-3 py-2 rounded-lg',
  md: 'px-4 py-2.5 rounded-xl',
  lg: 'px-5 py-3.5 rounded-xl',
};

const textSizeCls: Record<Size, string> = {
  sm: 'text-xs font-semibold',
  md: 'text-sm font-semibold',
  lg: 'text-base font-semibold',
};

type ButtonProps = PressableProps & {
  variant?: Variant;
  color?: Color;
  size?: Size;
  loading?: boolean;
  label?: string;
  className?: string;
  textClassName?: string;
  children?: React.ReactNode;
};

export function Button({
  variant = 'contained',
  color = 'primary',
  size = 'md',
  loading = false,
  disabled,
  label,
  className,
  textClassName,
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      {...props}
      disabled={isDisabled}
      className={cn(
        'flex-row items-center justify-center gap-2',
        containerCls[variant][color],
        sizeCls[size],
        isDisabled && 'opacity-50',
        className,
      )}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'contained' ? '#ffffff' : undefined}
        />
      ) : (
        children ?? (
          <Text className={cn(textCls[variant][color], textSizeCls[size], textClassName)}>
            {label}
          </Text>
        )
      )}
    </Pressable>
  );
}
