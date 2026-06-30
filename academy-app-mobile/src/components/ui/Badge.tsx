import { Text, View } from 'react-native';
import { cn } from '@/utils/cn';

type BadgeProps = {
  label: string;
  className?: string;
  textClassName?: string;
};

export function Badge({ label, className, textClassName }: BadgeProps) {
  return (
    <View className={cn('rounded-full px-2.5 py-0.5 bg-gray-100', className)}>
      <Text className={cn('text-xs font-semibold text-gray-600', textClassName)}>{label}</Text>
    </View>
  );
}

export const LEVEL_LABELS: Record<string, string> = {
  BEGINNER: 'Básico',
  INTERMEDIATE: 'Intermedio',
  ADVANCED: 'Avanzado',
  MASTER: 'Máster',
};

export const LEVEL_BADGE_CLS: Record<string, string> = {
  BEGINNER: 'bg-success/15',
  INTERMEDIATE: 'bg-primary/15',
  ADVANCED: 'bg-warning/15',
  MASTER: 'bg-dark/15',
};

export const LEVEL_TEXT_CLS: Record<string, string> = {
  BEGINNER: 'text-success',
  INTERMEDIATE: 'text-primary',
  ADVANCED: 'text-warning',
  MASTER: 'text-dark',
};
