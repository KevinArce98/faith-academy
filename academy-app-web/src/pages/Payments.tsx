import { PaymentsClient } from '@/components/dashboard/PaymentsClient';
import { InlineSpinner } from '@/components/ui/Spinner';
import { useActivePlans, useMe, usePaymentOrders } from '@/lib/queries';
import { isAdminOrTeacher } from '@/lib/roles';

export default function Payments() {
  const { data: me, isLoading: meLoading } = useMe();

  const {
    data: orders,
    isLoading: ordersLoading,
    isError,
  } = usePaymentOrders(!!me);

  const { data: plans, isLoading: plansLoading } = useActivePlans(
    !!me && !isAdminOrTeacher(me.role)
  );

  if (meLoading || ordersLoading || plansLoading) {
    return <InlineSpinner />;
  }

  if (isError || !orders || !me) {
    return (
      <div className="p-6 text-center text-sm text-danger">
        Error al cargar los pagos. Intenta de nuevo.
      </div>
    );
  }

  const isAdmin = isAdminOrTeacher(me.role);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const pendingCount = orders.filter((o) => o.status === 'PENDING_REVIEW').length;
  const monthCount = orders.filter((o) => new Date(o.createdAt) >= monthStart).length;

  return (
    <PaymentsClient
      orders={orders}
      pendingCount={pendingCount}
      monthCount={monthCount}
      isAdmin={isAdmin}
      plans={plans ?? []}
    />
  );
}
