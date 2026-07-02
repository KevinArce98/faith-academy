import { Platform, View, type ViewProps } from 'react-native';
import { theme } from '@/theme';
import { cn } from '@/utils/cn';

type CardProps = ViewProps & { className?: string };

const softShadow = Platform.select({
  ios: {
    shadowColor: theme.colors.dark,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  android: { elevation: 2 },
  default: {},
});

export function Card({ className, style, children, ...props }: CardProps) {
  return (
    <View
      className={cn('rounded-2xl border border-gray-100/80 bg-surface p-4', className)}
      style={[softShadow, style]}
      {...props}
    >
      {children}
    </View>
  );
}
