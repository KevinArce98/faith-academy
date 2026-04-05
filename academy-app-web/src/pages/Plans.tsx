import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/lib/api';
import { PlansClient } from '@/components/dashboard/PlansClient';
import { isAdminOrTeacher } from '@/lib/roles';
import type { Role } from '@/lib/roles';
import type { Plan } from '@/lib/interfaces/plans';
import { InlineSpinner } from '@/components/ui/Spinner';

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
    return <InlineSpinner />;
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
