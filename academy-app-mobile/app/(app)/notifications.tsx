import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { InlineSpinner } from '@/components/ui/Spinner';
import { usePullRefresh } from '@/hooks/usePullRefresh';
import { useMarkNotificationsRead } from '@/lib/mutations';
import { routeForNotification } from '@/lib/push';
import { useNotifications } from '@/lib/queries';
import { qkRoot } from '@/lib/queryKeys';
import { theme } from '@/theme';
import { cn } from '@/utils/cn';
import { timeAgo } from '@/utils/general';

type IoniconName = keyof typeof Ionicons.glyphMap;

const TYPE_ICON: Record<string, IoniconName> = {
  PAYMENT_SUBMITTED: 'card-outline',
  PAYMENT_STATUS: 'card-outline',
  CLASS_CHANGED: 'musical-notes-outline',
  EXPIRING_MEMBERSHIP: 'alert-circle-outline',
  MEMBERSHIP_EXPIRED: 'close-circle-outline',
};

export default function Notifications() {
  const router = useRouter();
  const refresh = usePullRefresh([qkRoot.notifications]);

  const { data, isLoading } = useNotifications();

  const markedRef = useRef(false);
  const markRead = useMarkNotificationsRead({
    onError: () => {
      // Permite reintentar en el próximo montaje si falló.
      markedRef.current = false;
    },
  });

  // Marcar todo como leído una sola vez, cuando la bandeja carga con no leídas.
  useEffect(() => {
    if (markedRef.current || !data || data.unreadCount === 0) return;
    markedRef.current = true;
    markRead.mutate();
  }, [data, markRead]);

  const notifications = data?.notifications ?? [];

  if (isLoading) {
    return <SafeAreaView className="flex-1 bg-background"><InlineSpinner /></SafeAreaView>;
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-4 pt-6 pb-2">
        <Text className="text-2xl font-bold text-dark">Notificaciones</Text>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id}
        refreshControl={refresh}
        contentContainerClassName="px-4 pb-6 gap-3"
        renderItem={({ item: n }) => {
          const route = routeForNotification(n.data);
          return (
            <Pressable disabled={!route} onPress={() => route && router.push(route as never)}>
              <Card className={cn(!n.read && 'border-primary/30 bg-primary/5')}>
                <View className="flex-row gap-3">
                  <View className="h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                    <Ionicons
                      name={TYPE_ICON[n.type] ?? 'notifications-outline'}
                      size={18}
                      color={theme.colors.primary}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-dark">{n.title}</Text>
                    <Text className="text-sm text-gray-500">{n.body}</Text>
                    <Text className="mt-1 text-xs text-gray-400">{timeAgo(n.createdAt)}</Text>
                  </View>
                  {!n.read && <View className="mt-1 h-2 w-2 rounded-full bg-primary" />}
                </View>
              </Card>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <EmptyState message="No tienes notificaciones." icon="notifications-outline" />
        }
      />
    </SafeAreaView>
  );
}
