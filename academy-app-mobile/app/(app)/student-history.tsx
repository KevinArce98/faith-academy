import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RoleGuard } from '@/components/auth/RoleGuard';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { InlineSpinner } from '@/components/ui/Spinner';
import { usePullRefresh } from '@/hooks/usePullRefresh';
import { useApiClient } from '@/lib/api';
import { qk, qkRoot } from '@/lib/queryKeys';
import { theme } from '@/theme';
import { cn } from '@/utils/cn';
import { formatPrice } from '@/utils/general';

type Month = {
  period: string; // "YYYY-MM"
  subscription: {
    planName: string;
    amount: number;
    isPaid: boolean;
    paidAt: string | null;
    expiresAt: string | null;
  } | null;
  enrolledClasses: { classId: string; className: string }[];
  sessions: { date: string; className: string }[];
};

type HistoryResponse = {
  student: { id: string; name: string | null; email: string };
  months: Month[];
};

function monthLabel(period: string): string {
  const [y, m] = period.split('-').map(Number);
  const label = new Date(y, m - 1, 1).toLocaleDateString(theme.locale, {
    month: 'long',
    year: 'numeric',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function StudentHistoryScreen() {
  return (
    <RoleGuard screen="/student-history">
      <StudentHistory />
    </RoleGuard>
  );
}

function StudentHistory() {
  const api = useApiClient();
  const params = useLocalSearchParams<{ id?: string; name?: string }>();
  const id = params.id ?? '';
  const refresh = usePullRefresh([qkRoot.studentHistory]);

  const { data, isLoading } = useQuery<HistoryResponse>({
    queryKey: qk.studentHistory(id),
    queryFn: () => api<HistoryResponse>(`/api/v1/students/${id}/history`),
    enabled: !!id,
  });

  if (isLoading) {
    return <SafeAreaView className="flex-1 bg-background"><InlineSpinner /></SafeAreaView>;
  }

  const months = data?.months ?? [];
  const name = data?.student.name ?? params.name ?? 'Alumno';

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-4 pt-6 pb-2">
        <Text className="text-2xl font-bold text-dark">Historial</Text>
        <Text className="text-sm text-gray-400">{name}</Text>
      </View>

      <FlatList
        data={months}
        keyExtractor={(m) => m.period}
        refreshControl={refresh}
        contentContainerClassName="px-4 py-4 gap-3"
        ListEmptyComponent={<EmptyState message="Sin historial todavía." icon="time-outline" />}
        renderItem={({ item: m }) => (
          <Card>
            <Text className="text-base font-bold text-dark mb-2">{monthLabel(m.period)}</Text>

            {/* Mensualidad */}
            {m.subscription ? (
              <View className="flex-row items-center justify-between rounded-xl bg-gray-50 px-3 py-2 mb-2">
                <View className="flex-1 min-w-0">
                  <Text className="text-sm font-medium text-dark" numberOfLines={1}>{m.subscription.planName}</Text>
                  <Text className="text-xs text-gray-400">{formatPrice(m.subscription.amount)}</Text>
                </View>
                <View className={cn('rounded-full px-2.5 py-0.5', m.subscription.isPaid ? 'bg-success/10' : 'bg-warning/10')}>
                  <Text className={cn('text-xs font-semibold', m.subscription.isPaid ? 'text-success' : 'text-warning')}>
                    {m.subscription.isPaid ? 'Pagado' : 'Pendiente'}
                  </Text>
                </View>
              </View>
            ) : (
              <Text className="text-xs text-gray-400 mb-2">Sin mensualidad este mes.</Text>
            )}

            {/* Clases inscritas */}
            {m.enrolledClasses.length > 0 && (
              <View className="mb-2">
                <Text className="text-xs font-semibold text-gray-500 mb-1">Inscrito en</Text>
                <View className="flex-row flex-wrap gap-1.5">
                  {m.enrolledClasses.map((c) => (
                    <View key={c.classId} className="rounded-full bg-primary/10 px-2.5 py-1">
                      <Text className="text-xs font-medium text-primary">{c.className}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Asistencias reales */}
            <Text className="text-xs text-gray-400">
              {m.sessions.length} {m.sessions.length === 1 ? 'asistencia registrada' : 'asistencias registradas'}
            </Text>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}
