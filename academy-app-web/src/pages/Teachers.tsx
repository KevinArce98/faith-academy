import { Navigate, useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/lib/api';
import { isAdmin, type Role } from '@/lib/roles';
import type { TeacherProfile } from '@/lib/interfaces/teachers';
import { TeachersClient } from '@/components/dashboard/teachers/TeachersClient';

export default function Teachers() {
  const { role } = useOutletContext<{ role: Role }>();
  if (!isAdmin(role)) return <Navigate to="/no-access" replace />;

  const apiClient = useApiClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => apiClient<TeacherProfile[]>('/api/v1/teachers'),
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
      <div className="p-6 text-center text-danger text-sm">
        Error al cargar los profesores. Intenta de nuevo.
      </div>
    );
  }

  const teachers = data;
  const activeCount = teachers.filter((t) => t.isActive).length;

  return <TeachersClient teachers={teachers} activeCount={activeCount} />;
}
