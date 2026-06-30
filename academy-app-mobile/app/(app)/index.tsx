import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { InlineSpinner } from '@/components/ui/Spinner';
import { Kpi } from '@/components/dashboard/Kpi';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { useApiClient } from '@/lib/api';
import { useAuth } from '@/lib/auth/useAuth';
import type { MeResponse } from '@/lib/interfaces/auth';
import { isStudent } from '@/lib/roles';
import { theme } from '@/theme';
import { formatPrice, formatShortDate, todayDow } from '@/utils/general';
import { formatSlotRange } from '@/utils/schedule';

// ─── Section heading ────────────────────────────────────────────────────────

function SectionTitle({ icon, children }: { icon: keyof typeof Ionicons.glyphMap; children: string }) {
  return (
    <View className="mb-3 flex-row items-center gap-2">
      <Ionicons name={icon} size={16} color={theme.colors.dark} />
      <Text className="text-base font-bold text-dark">{children}</Text>
    </View>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type PendingPayment = {
  subscriptionId: string | null;
  studentId: string;
  studentName: string;
  planName: string;
  amount: number;
  status: 'pending' | 'expired';
};

type AdminDashboard = {
  userName: string;
  activeStudents: number;
  monthCollected: number;
  monthPending: number;
  teacherPayout: number;
  pendingCount: number;
  pendingPayments: PendingPayment[];
  newStudents: { id: string; name: string | null; email: string; planName: string | null }[];
};

type TeacherSlot = { dayOfWeek: number; startTime: string; endTime: string };
type TeacherClass = { id: string; name: string; skillLevel: string; slots: TeacherSlot[]; oneOffDate: string | null; students: number };
type TeacherDashboard = {
  userName: string;
  totalClasses: number;
  totalStudents: number;
  hoursThisMonth: number;
  classes: TeacherClass[];
};

type StudentDashboard = {
  userName: string;
  subscription: { planName: string; amount: number; isPaid: boolean } | null;
  planActive: boolean;
  planExpired: boolean;
  expiresAt: string | null;
  classesThisMonth: { id: string; name: string }[];
  enrollmentFee: number | null;
};

// ─── Student view ─────────────────────────────────────────────────────────────

function LogoutButton() {
  const api = useApiClient();
  const { clearToken } = useAuth();
  function handleLogout() {
    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión', style: 'destructive',
        onPress: async () => {
          try {
            const { getStoredRefreshToken } = await import('@/lib/api');
            const refreshToken = await getStoredRefreshToken();
            await api('/api/v1/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) });
          } catch { /* limpia igual */ }
          clearToken();
        },
      },
    ]);
  }
  return (
    <Pressable
      onPress={handleLogout}
      className="mt-2 flex-row items-center justify-center gap-2 rounded-2xl border border-gray-100 bg-surface py-3.5 active:opacity-70"
    >
      <Ionicons name="log-out-outline" size={18} color={theme.colors.textMuted} />
      <Text className="text-sm font-semibold text-text-muted">Cerrar sesión</Text>
    </Pressable>
  );
}

function StudentView({ data }: { data: StudentDashboard }) {
  const router = useRouter();
  const statusColor = data.planActive ? theme.colors.success : data.planExpired ? theme.colors.danger : theme.colors.warning;

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-4 pt-2 pb-8 gap-4">
      <DashboardHeader name={data.userName} />

      {data.planExpired && (
        <View className="flex-row items-start gap-3 rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3.5">
          <Ionicons name="alert-circle" size={20} color={theme.colors.danger} style={{ marginTop: 1 }} />
          <View className="flex-1 gap-2.5">
            <Text className="text-sm font-medium text-danger">
              Tu plan venció el {formatShortDate(data.expiresAt)}. Renueva para seguir inscribiéndote.
            </Text>
            <Button label="Renovar plan" size="sm" onPress={() => router.push('/(app)/payments')} className="self-start" />
          </View>
        </View>
      )}

      <View className="flex-row gap-3">
        <Kpi
          label="Mi Plan"
          value={data.subscription?.planName ?? '—'}
          sub={data.subscription ? `${formatPrice(data.subscription.amount)} / mes` : undefined}
          icon="pricetag-outline"
          className="flex-1"
        />
        <Kpi
          label="Estado"
          value={data.planActive ? 'Activo' : data.planExpired ? 'Vencido' : 'Pendiente'}
          valueColor={data.planActive ? 'text-success' : data.planExpired ? 'text-danger' : 'text-warning'}
          sub={data.planActive && data.expiresAt ? `Vence ${formatShortDate(data.expiresAt)}` : undefined}
          icon={data.planActive ? 'checkmark-circle-outline' : 'time-outline'}
          iconColor={statusColor}
          className="flex-1"
        />
      </View>

      <Kpi
        label="Clases este Mes"
        value={String(data.classesThisMonth.length)}
        sub="clases inscritas"
        icon="calendar-outline"
      />

      <Card>
        <SectionTitle icon="school-outline">Mis Clases este Mes</SectionTitle>
        {data.classesThisMonth.length === 0 ? (
          <View className="items-center gap-2 py-6">
            <Ionicons name="calendar-clear-outline" size={28} color={theme.colors.textMuted} />
            <Text className="text-sm text-text-muted text-center">Aún no estás inscrito en clases este mes</Text>
          </View>
        ) : (
          <View className="flex-row flex-wrap gap-2">
            {data.classesThisMonth.map((cls) => (
              <View key={cls.id} className="flex-row items-center gap-1.5 rounded-full bg-primary/10 px-3 py-2">
                <View className="h-1.5 w-1.5 rounded-full bg-primary" />
                <Text className="text-sm font-semibold text-primary">{cls.name}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>
      <LogoutButton />
    </ScrollView>
  );
}

// ─── Teacher view ─────────────────────────────────────────────────────────────

function TeacherView({ data }: { data: TeacherDashboard }) {
  const router = useRouter();
  const dow = todayDow();
  const today = new Date().toISOString().split('T')[0];

  const todayClasses = data.classes
    .map((cls) => {
      const slot = cls.slots.find((s) => s.dayOfWeek === dow);
      if (!slot) return null;
      if (cls.oneOffDate && cls.oneOffDate !== today) return null;
      return { cls, slot };
    })
    .filter((x): x is { cls: TeacherClass; slot: TeacherSlot } => x !== null)
    .sort((a, b) => a.slot.startTime.localeCompare(b.slot.startTime));

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-4 pt-2 pb-8 gap-4">
      <DashboardHeader name={data.userName} />

      <View className="flex-row gap-3">
        <Kpi label="Mis Clases" value={String(data.totalClasses)} icon="albums-outline" className="flex-1" />
        <Kpi label="Alumnos" value={String(data.totalStudents)} sub="este mes" icon="people-outline" className="flex-1" />
        <Kpi label="Horas" value={`${data.hoursThisMonth}h`} sub="este mes" icon="time-outline" className="flex-1" />
      </View>

      <Card>
        <SectionTitle icon="today-outline">Clases de Hoy</SectionTitle>
        {todayClasses.length === 0 ? (
          <View className="items-center gap-2 py-6">
            <Ionicons name="cafe-outline" size={28} color={theme.colors.textMuted} />
            <Text className="text-sm text-text-muted text-center">No tienes clases hoy</Text>
          </View>
        ) : (
          <View className="gap-2">
            {todayClasses.map(({ cls, slot }) => (
              <View key={cls.id} className="flex-row items-center justify-between rounded-xl bg-background p-3">
                <View className="flex-1 mr-3">
                  <Text className="text-sm font-semibold text-dark">{cls.name}</Text>
                  <Text className="mt-0.5 text-xs text-text-muted">{formatSlotRange(slot.startTime, slot.endTime)} · {cls.students} alumnos</Text>
                </View>
                <Button
                  label="Lista"
                  size="sm"
                  onPress={() => router.push({ pathname: '/(app)/class-attendance', params: { classId: cls.id } })}
                />
              </View>
            ))}
          </View>
        )}
      </Card>
      <LogoutButton />
    </ScrollView>
  );
}

// ─── Admin view ───────────────────────────────────────────────────────────────

function AdminView({ data }: { data: AdminDashboard }) {
  const api = useApiClient();
  const queryClient = useQueryClient();

  const payMutation = useMutation({
    mutationFn: (p: PendingPayment) =>
      p.subscriptionId
        ? api(`/api/v1/subscriptions/${p.subscriptionId}/pay`, { method: 'PATCH', body: JSON.stringify({ isPaid: true }) })
        : api('/api/v1/subscriptions', { method: 'POST', body: JSON.stringify({ studentId: p.studentId, planId: undefined, isPaid: true }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-4 pt-2 pb-8 gap-4">
      <DashboardHeader name={data.userName} />

      <View className="flex-row gap-3 flex-wrap">
        <Kpi label="Alumnos Activos" value={String(data.activeStudents)} sub={`+${data.newStudents.length} nuevos`} subColor="text-success" icon="people-outline" className="flex-1 min-w-[140px]" />
        <Kpi label="Recaudado" value={formatPrice(data.monthCollected)} sub="mensualidades" subColor="text-success" icon="trending-up-outline" iconColor={theme.colors.success} className="flex-1 min-w-[140px]" />
        <Kpi label="Por Cobrar" value={formatPrice(data.monthPending)} valueColor="text-warning" sub={`${data.pendingCount} pendientes`} subColor="text-warning" icon="hourglass-outline" iconColor={theme.colors.warning} className="flex-1 min-w-[140px]" />
        <Kpi label="Pago Profes" value={formatPrice(data.teacherPayout)} sub="este mes" icon="wallet-outline" className="flex-1 min-w-[140px]" />
      </View>

      <Card>
        <SectionTitle icon="card-outline">Mensualidades Pendientes</SectionTitle>
        {data.pendingPayments.length === 0 ? (
          <View className="items-center gap-2 py-6">
            <Ionicons name="checkmark-done-circle-outline" size={28} color={theme.colors.success} />
            <Text className="text-sm text-text-muted text-center">Todas al día</Text>
          </View>
        ) : (
          <View className="gap-2">
            {data.pendingPayments.slice(0, 6).map((p) => (
              <View key={p.studentId} className="flex-row items-center gap-3 rounded-xl bg-background p-3">
                <Avatar name={p.studentName} size="sm" />
                <View className="flex-1 min-w-0">
                  <Text className="text-sm font-semibold text-dark" numberOfLines={1}>{p.studentName}</Text>
                  <Text className="text-xs text-text-muted" numberOfLines={1}>{p.planName} · {formatPrice(p.amount)}</Text>
                </View>
                <Button
                  label={p.status === 'expired' ? 'Renovar' : 'Pagado'}
                  size="sm"
                  color="success"
                  loading={payMutation.isPending}
                  onPress={() => payMutation.mutate(p)}
                />
              </View>
            ))}
          </View>
        )}
      </Card>

      {data.newStudents.length > 0 && (
        <Card>
          <SectionTitle icon="sparkles-outline">Alumnos Nuevos esta Semana</SectionTitle>
          <View className="gap-3">
            {data.newStudents.map((s) => (
              <View key={s.id} className="flex-row items-center gap-3">
                <Avatar name={s.name ?? s.email} size="sm" />
                <View className="flex-1 min-w-0">
                  <Text className="text-sm font-semibold text-dark" numberOfLines={1}>{s.name ?? s.email}</Text>
                  {s.planName && <Text className="text-xs text-primary">{s.planName}</Text>}
                </View>
              </View>
            ))}
          </View>
        </Card>
      )}
    </ScrollView>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const api = useApiClient();
  const { clearToken } = useAuth();

  const { data: me, isLoading: meLoading } = useQuery<MeResponse>({
    queryKey: ['me'],
    queryFn: () => api<MeResponse>('/api/v1/auth/me'),
    staleTime: 5 * 60 * 1000,
  });

  const role = me?.role;
  const studentRole = role ? isStudent(role) : false;
  const teacherRole = role === 'TEACHER';

  const endpoint = studentRole
    ? '/api/v1/dashboard/student'
    : teacherRole
      ? '/api/v1/dashboard/teacher'
      : '/api/v1/dashboard/admin';

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard', role ?? ''],
    queryFn: () => api(endpoint),
    enabled: !!role,
  });

  if (meLoading || isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <InlineSpinner />
      </SafeAreaView>
    );
  }

  if (isError || !data) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center px-6">
        <Text className="text-sm text-danger text-center">Error al cargar los datos. Intenta de nuevo.</Text>
        <Button label="Cerrar sesión" variant="ghost" color="neutral" size="sm" className="mt-4" onPress={clearToken} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {studentRole && <StudentView data={data as StudentDashboard} />}
      {teacherRole && <TeacherView data={data as TeacherDashboard} />}
      {!studentRole && !teacherRole && <AdminView data={data as AdminDashboard} />}
    </SafeAreaView>
  );
}
