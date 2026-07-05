import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth/useAuth';
import { useMe } from '@/lib/queries';
import { isAdmin, isStudent } from '@/lib/roles';
import { usePushNotifications } from '@/lib/usePushNotifications';
import { InlineSpinner } from '@/components/ui/Spinner';
import { theme } from '@/theme';

type IoniconName = keyof typeof Ionicons.glyphMap;

function tabIcon(name: IoniconName) {
  const TabBarIcon = ({ color, focused }: { color: ColorValue; focused: boolean; size: number }) => (
    <Ionicons name={(focused ? name : `${name}-outline`) as IoniconName} size={23} color={color as string} />
  );
  TabBarIcon.displayName = `TabBarIcon(${name})`;
  return TabBarIcon;
}

export default function AppLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const insets = useSafeAreaInsets();

  const { data: me, isLoading } = useMe(isSignedIn);

  usePushNotifications(isSignedIn);

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
          borderTopColor: theme.colors.border,
          height: 60 + insets.bottom,
          paddingTop: 6,
          paddingBottom: 8 + insets.bottom,
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

      {/* ── Clases (TEACHER + ADMIN) ── */}
      <Tabs.Screen
        name="classes"
        options={{
          title: 'Clases',
          href: teacher || admin ? undefined : null,
          tabBarIcon: tabIcon('musical-notes'),
        }}
      />

      {/* ── Mis Clases (STUDENT) ── */}
      <Tabs.Screen
        name="my-classes"
        options={{
          title: 'Mis Clases',
          href: student ? undefined : null,
          tabBarIcon: tabIcon('calendar'),
        }}
      />

      {/* ── Asistencia de Clase (TEACHER; admin la abre desde "Más") ── */}
      <Tabs.Screen
        name="class-attendance"
        options={{
          title: 'Asistencia',
          href: teacher ? undefined : null,
          tabBarIcon: tabIcon('checkbox'),
        }}
      />

      {/* ── Alumnos (ADMIN) ── */}
      <Tabs.Screen
        name="students"
        options={{
          title: 'Alumnos',
          href: admin ? undefined : null,
          tabBarIcon: tabIcon('people'),
        }}
      />

      {/* ── Pagos (STUDENT + ADMIN) ── */}
      <Tabs.Screen
        name="payments"
        options={{
          title: 'Pagos',
          href: student || admin ? undefined : null,
          tabBarIcon: tabIcon('card'),
        }}
      />

      {/* ── Planes (STUDENT; admin lo abre desde "Más") ── */}
      <Tabs.Screen
        name="plans"
        options={{
          title: 'Planes',
          href: student ? undefined : null,
          tabBarIcon: tabIcon('pricetag'),
        }}
      />

      {/* ── Más (todos los roles: Mi Cuenta; el resto del menú es solo admin) ── */}
      <Tabs.Screen
        name="more"
        options={{
          title: 'Más',
          tabBarIcon: tabIcon('grid'),
        }}
      />

      {/* ── Pantallas sin tab (accesibles desde otras pantallas) ── */}
      <Tabs.Screen name="teachers" options={{ href: null }} />
      <Tabs.Screen name="payouts" options={{ href: null }} />
      <Tabs.Screen name="monthly-attendance" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="student-history" options={{ href: null }} />
      {/* Mi Cuenta: accesible desde "Más" y el avatar del home, no como tab propio. */}
      <Tabs.Screen name="account" options={{ href: null }} />
    </Tabs>
  );
}
