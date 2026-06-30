import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import type { ColorValue } from 'react-native';

import { useApiClient } from '@/lib/api';
import { useAuth } from '@/lib/auth/useAuth';
import type { MeResponse } from '@/lib/interfaces/auth';
import { isAdmin, isStudent } from '@/lib/roles';
import { InlineSpinner } from '@/components/ui/Spinner';
import { theme } from '@/theme';

type IoniconName = keyof typeof Ionicons.glyphMap;

function tabIcon(name: IoniconName) {
  return ({ color, focused }: { color: ColorValue; focused: boolean; size: number }) => (
    <Ionicons name={(focused ? name : `${name}-outline`) as IoniconName} size={23} color={color as string} />
  );
}

export default function AppLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const api = useApiClient();

  const { data: me, isLoading } = useQuery<MeResponse>({
    queryKey: ['me'],
    queryFn: () => api<MeResponse>('/api/v1/auth/me'),
    enabled: isSignedIn,
    staleTime: 5 * 60 * 1000,
  });

  if (!isLoaded || isLoading) return <InlineSpinner />;
  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;

  const role = me?.role ?? 'STUDENT';
  const student = isStudent(role);
  const admin = isAdmin(role);
  const teacher = role === 'TEACHER';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: '#EEF2F7',
          height: 60,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: '600', marginTop: 2 },
        tabBarItemStyle: { paddingVertical: 0 },
      }}
    >
      {/* ── Inicio (todos los roles) ── */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: tabIcon('home'),
        }}
      />

      {/* ── STUDENT ── */}
      <Tabs.Screen
        name="my-classes"
        options={{
          title: 'Mis Clases',
          href: student ? undefined : null,
          tabBarIcon: tabIcon('calendar'),
        }}
      />
      <Tabs.Screen
        name="plans"
        options={{
          title: 'Planes',
          href: student || admin ? undefined : null,
          tabBarIcon: tabIcon('pricetag'),
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          title: 'Pagos',
          href: student || admin ? undefined : null,
          tabBarIcon: tabIcon('card'),
        }}
      />

      {/* ── TEACHER + ADMIN ── */}
      <Tabs.Screen
        name="classes"
        options={{
          title: 'Clases',
          href: teacher || admin ? undefined : null,
          tabBarIcon: tabIcon('musical-notes'),
        }}
      />
      <Tabs.Screen
        name="class-attendance"
        options={{
          title: 'Asistencia',
          href: teacher || admin ? undefined : null,
          tabBarIcon: tabIcon('checkbox'),
        }}
      />

      {/* ── ADMIN ── */}
      <Tabs.Screen
        name="students"
        options={{
          title: 'Alumnos',
          href: admin ? undefined : null,
          tabBarIcon: tabIcon('people'),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Más',
          href: admin ? undefined : null,
          tabBarIcon: tabIcon('grid'),
        }}
      />

      {/* ── Pantallas sin tab (accesibles desde other screens) ── */}
      <Tabs.Screen name="teachers" options={{ href: null }} />
      <Tabs.Screen name="payouts" options={{ href: null }} />
      <Tabs.Screen name="monthly-attendance" options={{ href: null }} />
    </Tabs>
  );
}
