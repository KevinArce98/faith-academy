import { Navigate, useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/lib/api';
import { isAdmin, type Role } from '@/lib/roles';
import { ReportsClient } from '@/components/dashboard/ReportsClient';
import type { ReportsClientProps } from '@/components/dashboard/reports/reports.types';
import { InlineSpinner } from '@/components/ui/Spinner';

export default function Reports() {
	const { role } = useOutletContext<{ role: Role }>();
	const apiClient = useApiClient();

	const { data, isLoading, isError } = useQuery<ReportsClientProps>({
		queryKey: ['reports'],
		queryFn: () => apiClient<ReportsClientProps>('/api/v1/reports'),
		staleTime: 5 * 60 * 1000,
		enabled: isAdmin(role),
	});

	if (!isAdmin(role)) return <Navigate to='/no-access' replace />;

	if (isLoading) {
		return <InlineSpinner />;
	}

	if (isError || !data) {
		return (
			<div className='p-6 text-center text-sm text-danger'>
				Error al cargar los reportes. Intenta de nuevo.
			</div>
		);
	}

	return <ReportsClient {...data} />;
}
