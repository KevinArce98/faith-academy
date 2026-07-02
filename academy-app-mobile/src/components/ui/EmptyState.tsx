import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { theme } from '@/theme';

type IoniconName = keyof typeof Ionicons.glyphMap;

type EmptyStateProps = { message: string; icon?: IoniconName };

export function EmptyState({ message, icon }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center py-16 px-6">
      {icon && (
        <View className="mb-3 h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
          <Ionicons name={icon} size={26} color={theme.colors.textMuted} />
        </View>
      )}
      <Text className="text-center text-sm text-gray-400">{message}</Text>
    </View>
  );
}
