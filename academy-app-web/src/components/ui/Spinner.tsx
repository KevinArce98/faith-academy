import { cn } from '@/lib/cn';

type SpinnerProps = {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
};

const sizeClasses = {
  xs: 'h-4 w-4 border-2',
  sm: 'h-6 w-6 border-4',
  md: 'h-8 w-8 border-4',
  lg: 'h-12 w-12 border-4',
};

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <div
      className={cn(
        'animate-spin rounded-full border-primary border-t-transparent',
        sizeClasses[size],
        className
      )}
    />
  );
}

export function FullPageSpinner() {
  return (
    <div className="flex h-screen items-center justify-center">
      <Spinner />
    </div>
  );
}

export function InlineSpinner() {
  return (
    <div className="flex items-center justify-center p-12">
      <Spinner />
    </div>
  );
}
