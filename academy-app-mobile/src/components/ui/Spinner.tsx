import { ActivityIndicator, View } from 'react-native';
import { theme } from '@/theme';

export function Spinner({ size = 'large' }: { size?: 'small' | 'large' }) {
  return (
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator size={size} color={theme.colors.primary} />
    </View>
  );
}

export function InlineSpinner() {
  return (
    <View className="flex-1 items-center justify-center py-12">
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
}

export function SmallSpinner({ color = '#ffffff' }: { color?: string }) {
  return <ActivityIndicator size="small" color={color} />;
}
