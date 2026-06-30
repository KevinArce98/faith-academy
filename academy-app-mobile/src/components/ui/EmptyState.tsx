import { Text, View } from 'react-native';

type EmptyStateProps = { message: string; emoji?: string };

export function EmptyState({ message, emoji }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center py-16 px-6">
      {emoji && <Text className="text-4xl mb-3">{emoji}</Text>}
      <Text className="text-center text-sm text-gray-400">{message}</Text>
    </View>
  );
}
