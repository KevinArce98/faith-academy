import { Navigate, useOutletContext } from 'react-router-dom';

import { TeachersClient } from '@/components/dashboard/teachers/TeachersClient';
import { InlineSpinner } from '@/components/ui/Spinner';
import { useTeachers } from '@/lib/queries';
import { type Role, isAdmin } from '@/lib/roles';

export default function Teachers() {
  const { role } = useOutletContext<{ role: Role }>();

  const { data, isLoading, isError } = useTeachers(isAdmin(role));

  if (!isAdmin(role)) return <Navigate to="/no-access" replace />;

  if (isLoading) {
    return <InlineSpinner />;
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
