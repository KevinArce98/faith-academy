import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/lib/api';
import { PaymentsClient } from '@/components/dashboard/PaymentsClient';
import { isAdminOrTeacher } from '@/lib/roles';
import type { Role } from '@/lib/roles';
import type { Order } from '@/components/dashboard/payments/payments.types';

type MeResponse = { name: string; role: Role };
type PlanOption = { id: string; name: string; price: number };
type OrdersResponse = { orders: Order[] } | Order[];

export default function Payments() {
  const apiClient = useApiClient();

  const { data: me, isLoading: meLoading } = useQuery<MeResponse>({
    queryKey: ['me'],
    queryFn: () => apiClient<MeResponse>('/api/v1/auth/me'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: ordersData, isLoading: ordersLoading, isError } = useQuery<OrdersResponse>({
    queryKey: ['payments'],
    queryFn: () => apiClient<OrdersResponse>('/api/v1/payments/orders'),
    enabled: !!me,
  });

  const { data: plansData, isLoading: plansLoading } = useQuery<PlanOption[]>({
    queryKey: ['plans-options'],
    queryFn: () => apiClient<PlanOption[]>('/api/v1/plans?activeOnly=true'),
    enabled: !!me && !isAdminOrTeacher(me.role),
  });

  if (meLoading || ordersLoading || plansLoading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isError || !ordersData || !me) {
    return (
      <div className="p-6 text-center text-sm text-danger">
        Error al cargar los pagos. Intenta de nuevo.
      </div>
    );
  }

  const orders: Order[] = Array.isArray(ordersData) ? ordersData : ordersData.orders;
  const isAdmin = isAdminOrTeacher(me.role);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const pendingCount = orders.filter((o) => o.status === 'PENDING_REVIEW').length;
  const monthCount = orders.filter((o) => new Date(o.createdAt) >= monthStart).length;
  const plans = plansData ?? [];

  return (
    <PaymentsClient
      orders={orders}
      pendingCount={pendingCount}
      monthCount={monthCount}
      isAdmin={isAdmin}
      plans={plans}
    />
  );
}
