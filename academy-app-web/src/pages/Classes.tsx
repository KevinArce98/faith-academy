import { useOutletContext } from 'react-router-dom';

import { ClassesClient } from '@/components/dashboard/ClassesClient';
import { InlineSpinner } from '@/components/ui/Spinner';
import { useAssignableTeachers, useClasses } from '@/lib/queries';
import type { Role } from '@/lib/roles';

export default function Classes() {
  const { role, userId } = useOutletContext<{ role: Role; userId: string }>();

  const {
    data: classes,
    isLoading: classesLoading,
    isError: classesError,
  } = useClasses();

  // Lista asignable (profesores + admins): el admin la usa para asignar y el
  // profesor para ver qué profe imparte cada clase. Solo id/name/role.
  const { data: assignable, isLoading: teachersLoading } = useAssignableTeachers();

  if (classesLoading || teachersLoading) {
    return <InlineSpinner />;
  }

  if (classesError || !classes) {
    return (
      <div className="p-6 text-center text-sm text-danger">
        Error al cargar las clases. Intenta de nuevo.
      </div>
    );
  }

  const teachers = (assignable ?? []).map((t) => ({
    id: t.id,
    name: t.name ?? '',
  }));

  return (
    <ClassesClient classes={classes} teachers={teachers} role={role} userId={userId} />
  );
}
