import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RoleGuard } from '@/components/auth/RoleGuard';
import { getStoredRefreshToken, useApiClient } from '@/lib/api';
import { useAuth } from '@/lib/auth/useAuth';
import { useMe } from '@/lib/queries';
import { isAdmin } from '@/lib/roles';
import { getRegisteredPushToken } from '@/lib/usePushNotifications';
import { theme } from '@/theme';
import { cn } from '@/utils/cn';

type IoniconName = keyof typeof Ionicons.glyphMap;

type MenuRoute =
  | '/(app)/plans'
  | '/(app)/teachers'
  | '/(app)/class-attendance'
  | '/(app)/monthly-attendance'
  | '/(app)/payouts';

type MenuItem = {
  label: string;
  description: string;
  icon: IoniconName;
  route: MenuRoute;
};

const MENU: MenuItem[] = [
  {
    label: 'Planes',
    description: 'Mensualidades y membresías',
    icon: 'pricetag-outline',
    route: '/(app)/plans',
  },
  {
    label: 'Profesores',
    description: 'Gestiona el equipo docente',
    icon: 'school-outline',
    route: '/(app)/teachers',
  },
  {
    label: 'Asistencia de Clase',
    description: 'Toma de asistencia por sesión',
    icon: 'checkbox-outline',
    route: '/(app)/class-attendance',
  },
  {
    label: 'Asistencia Mensual',
    description: 'Resumen de asistencia del mes',
    icon: 'clipboard-outline',
    route: '/(app)/monthly-attendance',
  },
  {
    label: 'Nómina',
    description: 'Pagos a profesores por asistencia',
    icon: 'cash-outline',
    route: '/(app)/payouts',
  },
];

export default function MoreScreen() {
  return (
    <RoleGuard screen="/more">
      <More />
    </RoleGuard>
  );
}

function More() {
  const router = useRouter();
  const api = useApiClient();
  const { clearToken } = useAuth();
  const { data: me } = useMe();
  const admin = isAdmin(me?.role ?? 'STUDENT');

  async function handleLogout() {
    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: async () => {
          try {
            const pushToken = getRegisteredPushToken();
            if (pushToken) {
              await api('/api/v1/notifications/unregister-device', {
                method: 'POST',
                body: JSON.stringify({ token: pushToken }),
              });
            }
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

        <View>
          <Text className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Cuenta
          </Text>
          <View className="overflow-hidden rounded-2xl border border-gray-100 bg-surface">
            <Pressable
              onPress={() => router.push('/(app)/account')}
              className="flex-row items-center gap-3 border-b border-gray-100 px-4 py-4"
              android_ripple={{ color: theme.colors.border }}
            >
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Ionicons name="person-circle-outline" size={20} color={theme.colors.primary} />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-dark">Mi Cuenta</Text>
                <Text className="text-xs text-gray-400">Perfil, notificaciones, contraseña</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.placeholder} />
            </Pressable>
            <Pressable
              onPress={handleLogout}
              className="flex-row items-center gap-3 px-4 py-4"
              android_ripple={{ color: theme.colors.border }}
            >
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-danger/10">
                <Ionicons name="log-out-outline" size={20} color={theme.colors.danger} />
              </View>
              <Text className="flex-1 text-[15px] font-semibold text-danger">Cerrar sesión</Text>
            </Pressable>
          </View>
        </View>

        {admin && (
          <View>
            <Text className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Administración
            </Text>
            <View className="overflow-hidden rounded-2xl border border-gray-100 bg-surface">
              {MENU.map((item, index) => (
                <Pressable
                  key={item.route}
                  onPress={() => router.push(item.route)}
                  className={cn(
                    'flex-row items-center gap-3 px-4 py-4',
                    index < MENU.length - 1 && 'border-b border-gray-100',
                  )}
                  android_ripple={{ color: theme.colors.border }}
                >
                  <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <Ionicons name={item.icon} size={20} color={theme.colors.primary} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[15px] font-semibold text-dark">{item.label}</Text>
                    <Text className="text-xs text-gray-400">{item.description}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.placeholder} />
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <View className="items-center pt-4">
          <View className="mb-2 h-11 w-11 items-center justify-center rounded-2xl bg-primary">
            <Text className="text-base font-bold text-white">{theme.studio.logoText}</Text>
          </View>
          <Text className="text-xs font-medium text-gray-400">{theme.studio.name}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
