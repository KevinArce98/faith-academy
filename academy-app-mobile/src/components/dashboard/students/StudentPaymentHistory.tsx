import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ReceiptViewer } from '@/components/dashboard/payments/ReceiptViewer';
import { InlineSpinner } from '@/components/ui/Spinner';
import { ORDER_STATUS_COLOR, ORDER_STATUS_LABEL } from '@/lib/interfaces/payments';
import { usePaymentOrders } from '@/lib/queries';
import { formatPrice, timeAgo } from '@/utils/general';

type StudentPaymentHistoryProps = {
  studentId: string;
};

export function StudentPaymentHistory({ studentId }: StudentPaymentHistoryProps) {
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);

  const { data: allOrders = [], isLoading } = usePaymentOrders();
  const orders = allOrders.filter((o) => o.student?.id === studentId);

  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-dark">Historial de pagos</Text>

      {isLoading ? (
        <InlineSpinner />
      ) : orders.length === 0 ? (
        <Text className="text-xs text-gray-400">Sin pagos registrados.</Text>
      ) : (
        <View className="gap-2">
          {orders.map((o) => (
            <Pressable
              key={o.id}
              disabled={!o.receiptUrl}
              onPress={() => setViewerUrl(o.receiptUrl)}
              className="flex-row items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3"
            >
              <View className="flex-1 min-w-0">
                <Text className="text-sm font-medium text-dark" numberOfLines={1}>
                  {o.plan.name}
                </Text>
                <Text className="text-xs text-gray-400">
                  {formatPrice(o.plan.price)} · {timeAgo(o.createdAt)}
                </Text>
              </View>
              <Text className={ORDER_STATUS_COLOR[o.status] ?? 'text-gray-400'}>
                {ORDER_STATUS_LABEL[o.status] ?? o.status}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <ReceiptViewer url={viewerUrl} onClose={() => setViewerUrl(null)} />
    </View>
  );
}
