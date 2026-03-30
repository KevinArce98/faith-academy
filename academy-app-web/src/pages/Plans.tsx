import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/lib/api';
import { PlansClient } from '@/components/dashboard/PlansClient';
import { isAdminOrTeacher } from '@/lib/roles';
import type { Role } from '@/lib/roles';
import type { Plan } from '@shared/interfaces/plans';

type MeResponse = { name: string; role: Role };
type PlansResponse = { plans: Plan[] } | Plan[];

export default function Plans() {
  const apiClient = useApiClient();

  const { data: me } = useQuery<MeResponse>({
    queryKey: ['me'],
    queryFn: () => apiClient<MeResponse>('/api/v1/auth/me'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: plansData, isLoading, isError } = useQuery<PlansResponse>({
    queryKey: ['plans'],
    queryFn: () => apiClient<PlansResponse>('/api/v1/plans'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isError || !plansData) {
    return (
      <div className="p-6 text-center text-sm text-danger">
        Error al cargar los planes. Intenta de nuevo.
      </div>
    );
  }

  const plans: Plan[] = Array.isArray(plansData) ? plansData : plansData.plans;
  const isAdmin = me ? isAdminOrTeacher(me.role) : false;

  return <PlansClient plans={plans} isAdmin={isAdmin} />;
}
