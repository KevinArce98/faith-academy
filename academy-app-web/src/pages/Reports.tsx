import { useQuery } from '@tanstack/react-query';
import { Navigate, useOutletContext } from 'react-router-dom';

import { ReportsClient } from '@/components/dashboard/ReportsClient';
import type { ReportsClientProps } from '@/components/dashboard/reports/reports.types';
import { InlineSpinner } from '@/components/ui/Spinner';
import { useApiClient } from '@/lib/api';
import studioConfig from '@/lib/config/studio.config';
import { type Role, isAdmin } from '@/lib/roles';

export default function Reports() {
	const { role } = useOutletContext<{ role: Role }>();
	const apiClient = useApiClient();

	const { data, isLoading, isError } = useQuery<ReportsClientProps>({
		queryKey: ['reports'],
		queryFn: () => apiClient<ReportsClientProps>('/api/v1/reports'),
		staleTime: 5 * 60 * 1000,
		enabled: isAdmin(role) && studioConfig.features.reports,
	});

	// Aparcado para fase 2: el reporte actual se reemplaza por el de pago a profesores. Reactivar con features.reports.
	if (!studioConfig.features.reports) return <Navigate to="/no-access" replace />;

	if (!isAdmin(role)) return <Navigate to="/no-access" replace />;

	if (isLoading) {
		return <InlineSpinner />;
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
