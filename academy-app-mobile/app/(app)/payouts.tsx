import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Kpi } from '@/components/dashboard/Kpi';
import { InlineSpinner } from '@/components/ui/Spinner';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { usePullRefresh } from '@/hooks/usePullRefresh';
import { usePayouts } from '@/lib/queries';
import { qkRoot } from '@/lib/queryKeys';
import { theme } from '@/theme';
import { currentMonth, formatMonthYear, formatPrice, shiftMonth } from '@/utils/general';

export default function PayoutsScreen() {
  return (
    <RoleGuard screen="/payouts">
      <Payouts />
    </RoleGuard>
  );
}

function MonthNavigator({
  period,
  onChange,
}: {
  period: string;
  onChange: (p: string) => void;
}) {
  // No se navega al futuro: no hay nómina de meses que no han ocurrido.
  const atCurrent = period >= currentMonth();

  return (
    <View className="flex-row items-center justify-between">
      <TouchableOpacity
        onPress={() => onChange(shiftMonth(period, -1))}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        className="h-9 w-9 items-center justify-center rounded-full bg-white"
      >
        <Ionicons name="chevron-back" size={20} color={theme.colors.dark} />
      </TouchableOpacity>

      <Text className="text-2xl font-bold text-dark">{formatMonthYear(period)}</Text>

      <TouchableOpacity
        disabled={atCurrent}
        onPress={() => onChange(shiftMonth(period, 1))}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        className="h-9 w-9 items-center justify-center rounded-full bg-white"
      >
        <Ionicons
          name="chevron-forward"
          size={20}
          color={atCurrent ? theme.colors.placeholder : theme.colors.dark}
        />
      </TouchableOpacity>
    </View>
  );
}

function Payouts() {
  const [period, setPeriod] = useState(currentMonth());
  const { data, isLoading, isError } = usePayouts(period);

  const refresh = usePullRefresh([qkRoot.payouts]);

  const header = (
    <View className="gap-5 mb-4">
      <Text className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        Nómina
      </Text>
      <MonthNavigator period={period} onChange={setPeriod} />

      {data && (
        <View className="flex-row gap-3 flex-wrap">
          <Kpi label="Recaudado" value={formatPrice(data.totals.collected)} subColor="text-success" className="flex-1 min-w-[140px]" />
          <Kpi label="Por cobrar" value={formatPrice(data.totals.pending)} valueColor="text-warning" className="flex-1 min-w-[140px]" />
          <Kpi label="Asignado" value={formatPrice(data.totals.allocated)} className="flex-1 min-w-[140px]" />
          <Kpi label="Sin asignar" value={formatPrice(data.totals.unallocated)} className="flex-1 min-w-[140px]" />
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <FlatList
        data={data?.payouts ?? []}
        keyExtractor={(t) => t.teacherId}
        refreshControl={refresh}
        contentContainerClassName="px-4 py-6 gap-4"
        ListHeaderComponent={header}
        ListEmptyComponent={
          isLoading ? (
            <InlineSpinner />
          ) : isError ? (
            <Text className="text-sm text-danger">Error al cargar la nómina.</Text>
          ) : (
            <EmptyState message="No hay nómina para este período." icon="cash-outline" />
          )
        }
        renderItem={({ item: t }) => (
          <Card>
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
        )}
      />
    </SafeAreaView>
  );
}
