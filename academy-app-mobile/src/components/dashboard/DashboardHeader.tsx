import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { useNotifications } from '@/lib/queries';
import { theme } from '@/theme';
import { formatDate, greeting } from '@/utils/general';

type Props = { name: string; avatarUrl?: string | null };

export function DashboardHeader({ name, avatarUrl }: Props) {
  const router = useRouter();
  const firstName = name.split(' ')[0];

  const { data } = useNotifications();
  const unread = data?.unreadCount ?? 0;

  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-1 pr-3">
        <Text className="text-[13px] font-medium capitalize text-text-muted">{formatDate(new Date())}</Text>
        <Text className="mt-0.5 text-2xl font-bold text-dark" numberOfLines={1}>
          {greeting()}, {firstName}
        </Text>
      </View>

      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={() => router.push('/(app)/notifications')}
          hitSlop={8}
          className="h-11 w-11 items-center justify-center rounded-full bg-surface border border-gray-100"
        >
          <Ionicons name="notifications-outline" size={22} color={theme.colors.dark} />
          {unread > 0 && (
            <View className="absolute -right-0.5 -top-0.5 min-w-[18px] h-[18px] items-center justify-center rounded-full bg-primary px-1">
              <Text className="text-[10px] font-bold text-white">{unread > 9 ? '9+' : unread}</Text>
            </View>
          )}
        </Pressable>
        <Pressable onPress={() => router.push('/(app)/account')}>
          <Avatar name={name} uri={avatarUrl} size="md" />
        </Pressable>
      </View>
    </View>
  );
}
