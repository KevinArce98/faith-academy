import { useQuery } from '@tanstack/react-query';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Kpi } from '@/components/dashboard/Kpi';
import { InlineSpinner } from '@/components/ui/Spinner';
import { useApiClient } from '@/lib/api';
import { formatPrice, currentMonth } from '@/utils/general';

type ClassLine = { classId: string; className: string; amount: number; students: number };
type TeacherPayout = {
  teacherId: string;
  teacherName: string;
  total: number;
  hoursWorked: number;
  net: number;
  classes: ClassLine[];
};
type PayoutsResponse = {
  period: string;
  totals: { collected: number; pending: number; allocated: number; unallocated: number };
  payouts: TeacherPayout[];
};

export default function Payouts() {
  const api = useApiClient();
  const period = currentMonth();

  const { data, isLoading, isError } = useQuery<PayoutsResponse>({
    queryKey: ['payouts', period],
    queryFn: () => api<PayoutsResponse>(`/api/v1/payouts?period=${period}`),
  });

  if (isLoading) return <SafeAreaView className="flex-1 bg-background"><InlineSpinner /></SafeAreaView>;
  if (isError || !data) {
    return (
      <SafeAreaView className="flex-1 bg-background px-4 pt-6">
        <Text className="text-sm text-danger">Error al cargar la nómina.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerClassName="px-4 py-6 gap-5">
        <Text className="text-2xl font-bold text-dark">Nómina — {data.period}</Text>

        <View className="flex-row gap-3 flex-wrap">
          <Kpi label="Recaudado" value={formatPrice(data.totals.collected)} subColor="text-success" className="flex-1 min-w-[140px]" />
          <Kpi label="Por cobrar" value={formatPrice(data.totals.pending)} valueColor="text-warning" className="flex-1 min-w-[140px]" />
          <Kpi label="Asignado" value={formatPrice(data.totals.allocated)} className="flex-1 min-w-[140px]" />
          <Kpi label="Sin asignar" value={formatPrice(data.totals.unallocated)} className="flex-1 min-w-[140px]" />
        </View>

        {data.payouts.length === 0 ? (
          <EmptyState message="No hay nómina para este período." emoji="💰" />
        ) : (
          <View className="gap-4">
            {data.payouts.map((t) => (
              <Card key={t.teacherId}>
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="font-bold text-dark">{t.teacherName}</Text>
                  <Text className="text-lg font-bold text-success">{formatPrice(t.net)}</Text>
                </View>
                <Text className="text-xs text-gray-400 mb-3">{t.hoursWorked}h trabajadas · Total bruto {formatPrice(t.total)}</Text>

                {t.classes.map((cl) => (
                  <View key={cl.classId} className="flex-row items-center justify-between py-1.5 border-t border-gray-100">
                    <View className="flex-1 min-w-0 mr-2">
                      <Text className="text-sm text-dark" numberOfLines={1}>{cl.className}</Text>
                      <Text className="text-xs text-gray-400">{cl.students} alumnos</Text>
                    </View>
                    <Text className="text-sm font-medium text-dark">{formatPrice(cl.amount)}</Text>
                  </View>
                ))}
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
