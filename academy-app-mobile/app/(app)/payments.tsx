import { useQuery } from '@tanstack/react-query';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { InlineSpinner } from '@/components/ui/Spinner';
import { useApiClient } from '@/lib/api';
import type { MeResponse } from '@/lib/interfaces/auth';
import type { Order } from '@/lib/interfaces/payments';
import { ORDER_STATUS_COLOR, ORDER_STATUS_LABEL } from '@/lib/interfaces/payments';
import { isAdminOrTeacher } from '@/lib/roles';
import { formatPrice, timeAgo } from '@/utils/general';

export default function Payments() {
  const api = useApiClient();

  const { data: me, isLoading: meLoading } = useQuery<MeResponse>({
    queryKey: ['me'],
    queryFn: () => api<MeResponse>('/api/v1/auth/me'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: ordersData, isLoading: ordersLoading } = useQuery<Order[] | { orders: Order[] }>({
    queryKey: ['payments'],
    queryFn: () => api<Order[] | { orders: Order[] }>('/api/v1/payments/orders'),
    enabled: !!me,
  });

  if (meLoading || ordersLoading) {
    return <SafeAreaView className="flex-1 bg-background"><InlineSpinner /></SafeAreaView>;
  }

  const orders: Order[] = !ordersData ? [] : Array.isArray(ordersData) ? ordersData : ordersData.orders;
  const isAdmin = me ? isAdminOrTeacher(me.role) : false;

  const pending = orders.filter((o) => o.status === 'PENDING_REVIEW');
  const active = orders.filter((o) => o.status === 'ACTIVE');
  const rejected = orders.filter((o) => o.status === 'REJECTED');

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerClassName="px-4 py-6 gap-5">
        <Text className="text-2xl font-bold text-dark">
          {isAdmin ? 'Pagos' : 'Mis Pagos'}
        </Text>

        {orders.length === 0 ? (
          <EmptyState message="No hay pagos registrados." emoji="💳" />
        ) : (
          <>
            {pending.length > 0 && (
              <View className="gap-3">
                <Text className="font-semibold text-dark">En revisión ({pending.length})</Text>
                {pending.map((o) => <OrderCard key={o.id} order={o} isAdmin={isAdmin} />)}
              </View>
            )}
            {active.length > 0 && (
              <View className="gap-3">
                <Text className="font-semibold text-dark">Aprobados ({active.length})</Text>
                {active.map((o) => <OrderCard key={o.id} order={o} isAdmin={isAdmin} />)}
              </View>
            )}
            {rejected.length > 0 && (
              <View className="gap-3">
                <Text className="font-semibold text-dark">Rechazados ({rejected.length})</Text>
                {rejected.map((o) => <OrderCard key={o.id} order={o} isAdmin={isAdmin} />)}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function OrderCard({ order, isAdmin }: { order: Order; isAdmin: boolean }) {
  return (
    <Card>
      <View className="flex-row items-start justify-between gap-2 mb-1">
        <Text className="font-semibold text-dark flex-1" numberOfLines={1}>
          {order.plan.name}
        </Text>
        <Text className={ORDER_STATUS_COLOR[order.status] ?? 'text-gray-400'}>
          {ORDER_STATUS_LABEL[order.status] ?? order.status}
        </Text>
      </View>

      {isAdmin && order.student && (
        <Text className="text-sm text-gray-500 mb-1" numberOfLines={1}>{order.student.name}</Text>
      )}

      <Text className="text-xl font-bold text-dark mb-1">{formatPrice(order.plan.price)}</Text>

      {order.bookingClass && (
        <Text className="text-xs text-gray-400">Clase: {order.bookingClass.name}</Text>
      )}
      {order.bookingDate && (
        <Text className="text-xs text-gray-400">Fecha: {order.bookingDate}</Text>
      )}

      <Text className="text-xs text-gray-400 mt-2">{timeAgo(order.createdAt)}</Text>
    </Card>
  );
}
