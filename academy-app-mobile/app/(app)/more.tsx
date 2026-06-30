import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getStoredRefreshToken, useApiClient } from '@/lib/api';
import { useAuth } from '@/lib/auth/useAuth';
import { theme } from '@/theme';

type MenuItem = {
  label: string;
  emoji: string;
  route: '/(app)/teachers' | '/(app)/payouts' | '/(app)/monthly-attendance';
};

const MENU: MenuItem[] = [
  { label: 'Profesores', emoji: '🎓', route: '/(app)/teachers' },
  { label: 'Nómina', emoji: '💰', route: '/(app)/payouts' },
  { label: 'Asistencia Mensual', emoji: '📋', route: '/(app)/monthly-attendance' },
];

export default function More() {
  const router = useRouter();
  const api = useApiClient();
  const { clearToken } = useAuth();

  async function handleLogout() {
    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: async () => {
          try {
            const refreshToken = await getStoredRefreshToken();
            await api('/api/v1/auth/logout', {
              method: 'POST',
              body: JSON.stringify({ refreshToken }),
            });
          } catch {
            // Limpia tokens aunque falle la petición
          }
          clearToken();
        },
      },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerClassName="px-4 py-6 gap-6">
        <Text className="text-2xl font-bold text-dark">Más</Text>

        <View className="gap-2">
          {MENU.map((item) => (
            <Pressable
              key={item.route}
              onPress={() => router.push(item.route)}
              className="flex-row items-center gap-4 rounded-2xl border border-gray-100 bg-surface px-5 py-4 shadow-sm"
            >
              <Text className="text-2xl">{item.emoji}</Text>
              <Text className="text-base font-semibold text-dark flex-1">{item.label}</Text>
              <Text className="text-gray-400">›</Text>
            </Pressable>
          ))}
        </View>

        <View className="mt-4 pt-4 border-t border-gray-100">
          <Pressable
            onPress={handleLogout}
            className="flex-row items-center gap-4 rounded-2xl border border-danger/20 bg-danger/5 px-5 py-4"
          >
            <Text className="text-2xl">🚪</Text>
            <Text className="text-base font-semibold text-danger flex-1">Cerrar sesión</Text>
          </Pressable>
        </View>

        <View className="items-center pt-2">
          <View className="h-10 w-10 rounded-xl bg-primary items-center justify-center mb-2">
            <Text className="text-base font-bold text-white">{theme.studio.logoText}</Text>
          </View>
          <Text className="text-xs text-gray-400">{theme.studio.name}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
