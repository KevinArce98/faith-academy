import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/lib/api';
import type { Plan, Student } from '@/lib/interfaces/students';
import { StudentsClient } from '@/components/dashboard/students/StudentsClient';
import { InlineSpinner } from '@/components/ui/Spinner';

type StudentsResponse = { students: Student[]; total: number };
type PlansResponse = { plans: Plan[] } | Plan[];

export default function Students() {
	const apiClient = useApiClient();

	const {
		data: studentsData,
		isLoading: studentsLoading,
		isError: studentsError,
	} = useQuery<StudentsResponse>({
		queryKey: ['students'],
		queryFn: () => apiClient<StudentsResponse>('/api/v1/students'),
	});

	const {
		data: plansData,
		isLoading: plansLoading,
		isError: plansError,
	} = useQuery<PlansResponse>({
		queryKey: ['plans'],
		queryFn: () => apiClient<PlansResponse>('/api/v1/plans'),
	});

	if (studentsLoading || plansLoading) {
		return <InlineSpinner />;
	}

	if (studentsError || plansError || !studentsData) {
		return (
			<div className='p-6'>
				<p className='text-danger text-sm'>
					Error al cargar los datos. Por favor, intenta de nuevo.
				</p>
			</div>
		);
	}

	const plans = Array.isArray(plansData)
		? plansData
		: ((plansData as { plans: Plan[] })?.plans ?? []);

	return (
		<StudentsClient
			students={studentsData.students}
			plans={plans}
			total={studentsData.total}
		/>
	);
}
