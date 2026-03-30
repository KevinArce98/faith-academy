import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/lib/api';
import { ReportsClient } from '@/components/dashboard/ReportsClient';
import type { ReportsClientProps } from '@/components/dashboard/reports/reports.types';

export default function Reports() {
  const apiClient = useApiClient();

  const { data, isLoading, isError } = useQuery<ReportsClientProps>({
    queryKey: ['reports'],
    queryFn: () => apiClient<ReportsClientProps>('/api/v1/reports'),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6 text-center text-sm text-danger">
        Error al cargar los reportes. Intenta de nuevo.
      </div>
    );
  }

  return <ReportsClient {...data} />;
}
