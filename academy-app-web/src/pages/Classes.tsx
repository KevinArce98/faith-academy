import { useQuery } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';

import { ClassesClient } from '@/components/dashboard/ClassesClient';
import { InlineSpinner } from '@/components/ui/Spinner';
import { useApiClient } from '@/lib/api';
import type { MeResponse } from '@/lib/interfaces/auth';
import type { TeacherProfile } from '@/lib/interfaces/teachers';
import type { Role } from '@/lib/roles';

function getMondayISO(date: Date): string {
	const d = new Date(date);
	const day = d.getDay();
	const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
	d.setDate(diff);
	d.setHours(0, 0, 0, 0);
	return d.toISOString();
}

export default function Classes() {
	const { role, userId } = useOutletContext<{ role: Role; userId: string }>();
	const apiClient = useApiClient();
	const weekStart = getMondayISO(new Date());

	const {
		data: classesData,
		isLoading: classesLoading,
		isError: classesError,
	} = useQuery({
		queryKey: ['classes', weekStart],
		queryFn: () =>
			apiClient<{ classes: unknown[] }>(
				`/api/v1/classes?weekStart=${weekStart}`,
			),
	});

	// Only admins can fetch the full teachers list; teachers get their own profile from /me (cached)
	const { data: teachersData, isLoading: teachersLoading } = useQuery({
		queryKey: ['teachers-list'],
		queryFn: () => apiClient<TeacherProfile[]>('/api/v1/teachers'),
		staleTime: 5 * 60 * 1000,
		enabled: role === 'ADMIN',
	});

	const { data: meData } = useQuery({
		queryKey: ['me'],
		queryFn: () => apiClient<MeResponse>('/api/v1/auth/me'),
		staleTime: 5 * 60 * 1000,
		enabled: role === 'TEACHER',
	});

	if (classesLoading || (role === 'ADMIN' && teachersLoading)) {
		return <InlineSpinner />;
	}

	if (classesError || !classesData) {
		return (
			<div className="p-6 text-center text-sm text-danger">
				Error al cargar las clases. Intenta de nuevo.
			</div>
		);
	}

	// Admin: use full list; Teacher: inject only themselves so modals can display their name
	const teachers =
		role === 'ADMIN'
			? (teachersData ?? []).map((t) => ({ id: t.id, name: t.name ?? '' }))
			: meData
				? [{ id: meData.id, name: meData.name ?? '' }]
				: [{ id: userId, name: '' }];

	return (
		<ClassesClient
			classes={classesData.classes as never}
			teachers={teachers}
			weekStart={weekStart}
			role={role}
			userId={userId}
		/>
	);
}
