import { useQuery } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';

import { ClassesClient } from '@/components/dashboard/ClassesClient';
import { InlineSpinner } from '@/components/ui/Spinner';
import { useApiClient } from '@/lib/api';
import type { Role } from '@/lib/roles';

type AssignableTeacher = { id: string; name: string | null; role: string };

export default function Classes() {
  const { role, userId } = useOutletContext<{ role: Role; userId: string }>();
  const apiClient = useApiClient();

  const {
    data: classesData,
    isLoading: classesLoading,
    isError: classesError,
  } = useQuery({
    queryKey: ['classes'],
    queryFn: () => apiClient<{ classes: unknown[] }>('/api/v1/classes'),
  });

  // Lista asignable (profesores + admins): el admin la usa para asignar y el
  // profesor para ver qué profe imparte cada clase. Solo id/name/role.
  const { data: teachersData, isLoading: teachersLoading } = useQuery({
    queryKey: ['assignable-teachers'],
    queryFn: () => apiClient<{ teachers: AssignableTeacher[] }>('/api/v1/teachers/assignable'),
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

  const teachers = (teachersData?.teachers ?? []).map((t) => ({
    id: t.id,
    name: t.name ?? '',
  }));

  return (
    <ClassesClient
      classes={classesData.classes as never}
      teachers={teachers}
      role={role}
      userId={userId}
    />
  );
}
