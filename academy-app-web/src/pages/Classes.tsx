import { useQuery } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { useApiClient } from '@/lib/api';
import { ClassesClient } from '@/components/dashboard/ClassesClient';
import type { TeacherProfile } from '@/lib/interfaces/teachers';
import type { Role } from '@/lib/roles';
import { InlineSpinner } from '@/components/ui/Spinner';

function getMondayISO(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default function Classes() {
  const { role } = useOutletContext<{ role: Role }>();
  const apiClient = useApiClient();
  const weekStart = getMondayISO(new Date());

  const { data: classesData, isLoading: classesLoading, isError: classesError } = useQuery({
    queryKey: ['classes', weekStart],
    queryFn: () => apiClient<{ classes: unknown[] }>(`/api/v1/classes?weekStart=${weekStart}`),
  });

  const { data: teachersData, isLoading: teachersLoading } = useQuery({
    queryKey: ['teachers-list'],
    queryFn: () => apiClient<TeacherProfile[]>('/api/v1/teachers'),
    staleTime: 5 * 60 * 1000,
  });

  if (classesLoading || teachersLoading) {
    return <InlineSpinner />;
  }

  if (classesError || !classesData) {
    return (
      <div className="p-6 text-center text-sm text-danger">
        Error al cargar las clases. Intenta de nuevo.
      </div>
    );
  }

  const teachers = (teachersData ?? []).map((t) => ({ id: t.id, name: t.name ?? '' }));

  return (
    <ClassesClient
      classes={classesData.classes as never}
      teachers={teachers}
      weekStart={weekStart}
      role={role}
    />
  );
}
