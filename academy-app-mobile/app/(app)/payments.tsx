import { useState } from 'react';
import { Pressable, SectionList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EnrollmentPaymentCard } from '@/components/dashboard/payments/EnrollmentPaymentCard';
import { PaymentAdminActions } from '@/components/dashboard/payments/PaymentAdminActions';
import { ReceiptViewer } from '@/components/dashboard/payments/ReceiptViewer';
import { UploadPaymentSheet } from '@/components/dashboard/payments/UploadPaymentSheet';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { InlineSpinner } from '@/components/ui/Spinner';
import { usePullRefresh } from '@/hooks/usePullRefresh';
import type { Order } from '@/lib/interfaces/payments';
import { ORDER_STATUS_COLOR, ORDER_STATUS_LABEL } from '@/lib/interfaces/payments';
import { useMe, usePaymentOrders } from '@/lib/queries';
import { qkRoot } from '@/lib/queryKeys';
import { isAdmin as isAdminRole, isAdminOrTeacher, isStudent } from '@/lib/roles';
import { formatDateOnly, formatPrice, timeAgo } from '@/utils/general';

export default function PaymentsScreen() {
  return (
    <RoleGuard screen="/payments">
      <Payments />
    </RoleGuard>
  );
}

function Payments() {
  const [uploadOpen, setUploadOpen] = useState(false);

  const { data: me, isLoading: meLoading } = useMe();
  const { data: orders = [], isLoading: ordersLoading } = usePaymentOrders(!!me);

  const refresh = usePullRefresh([qkRoot.payments, qkRoot.enrollmentStatus]);

  if (meLoading || ordersLoading) {
    return <SafeAreaView className="flex-1 bg-background"><InlineSpinner /></SafeAreaView>;
  }

  const role = me?.role ?? 'STUDENT';
  const staff = isAdminOrTeacher(role);
  const admin = isAdminRole(role);
  const student = isStudent(role);

  const pending = orders.filter((o) => o.status === 'PENDING_REVIEW');
  const active = orders.filter((o) => o.status === 'ACTIVE');
  const expired = orders.filter((o) => o.status === 'EXPIRED');
  const rejected = orders.filter((o) => o.status === 'REJECTED');

  const sections = [
    { title: `En revisión (${pending.length})`, data: pending },
    { title: `Aprobados (${active.length})`, data: active },
    { title: `Vencidos (${expired.length})`, data: expired },
    { title: `Rechazados (${rejected.length})`, data: rejected },
  ].filter((s) => s.data.length > 0);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-4 pt-6 gap-4">
        <Text className="text-2xl font-bold text-dark">{staff ? 'Pagos' : 'Mis Pagos'}</Text>

        {student && <EnrollmentPaymentCard />}

        {student && (
          <Pressable
            onPress={() => setUploadOpen(true)}
            className="flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 py-3"
          >
            <Text className="text-lg text-primary">＋</Text>
            <Text className="text-sm font-semibold text-primary">Subir comprobante</Text>
          </Pressable>
        )}
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(o) => o.id}
        refreshControl={refresh}
        contentContainerClassName="px-4 py-4 gap-3"
        stickySectionHeadersEnabled={false}
        renderItem={({ item }) => <OrderCard order={item} staff={staff} admin={admin} />}
        renderSectionHeader={({ section }) => (
          <Text className="font-semibold text-dark pt-2">{section.title}</Text>
        )}
        ListEmptyComponent={<EmptyState message="No hay pagos registrados." icon="card-outline" />}
      />

      <UploadPaymentSheet visible={uploadOpen} onClose={() => setUploadOpen(false)} />
    </SafeAreaView>
  );
}

function OrderCard({ order, staff, admin }: { order: Order; staff: boolean; admin: boolean }) {
  const [viewerOpen, setViewerOpen] = useState(false);

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

      {staff && order.student && (
        <Text className="text-sm text-gray-500 mb-1" numberOfLines={1}>{order.student.name}</Text>
      )}

      <Text className="text-xl font-bold text-dark mb-1">{formatPrice(order.plan.price)}</Text>

      {order.bookingClass && (
        <Text className="text-xs text-gray-400">Clase: {order.bookingClass.name}</Text>
      )}
      {order.bookingDate && (
        <Text className="text-xs text-gray-400">Fecha: {formatDateOnly(order.bookingDate)}</Text>
      )}

      {order.status === 'REJECTED' && order.notes ? (
        <View className="mt-2 rounded-lg bg-danger/5 px-3 py-2">
          <Text className="text-xs text-danger">Motivo: {order.notes}</Text>
        </View>
      ) : null}

      <Text className="text-xs text-gray-400 mt-2">{timeAgo(order.createdAt)}</Text>

      {admin ? (
        <PaymentAdminActions order={order} />
      ) : (
        order.receiptUrl && (
          <Pressable onPress={() => setViewerOpen(true)} className="mt-3 pt-3 border-t border-gray-100">
            <Text className="text-sm font-semibold text-primary">Ver comprobante</Text>
          </Pressable>
        )
      )}

      <ReceiptViewer url={viewerOpen ? order.receiptUrl : null} onClose={() => setViewerOpen(false)} />
    </Card>
  );
}
