import { StudentsClient } from '@/components/dashboard/students/StudentsClient';
import { InlineSpinner } from '@/components/ui/Spinner';
import { usePlans, useStudents } from '@/lib/queries';

export default function Students() {
  const {
    data: students,
    isLoading: studentsLoading,
    isError: studentsError,
  } = useStudents();
  const { data: plans, isLoading: plansLoading, isError: plansError } = usePlans();

  if (studentsLoading || plansLoading) {
    return <InlineSpinner />;
  }

  if (studentsError || plansError || !students) {
    return (
      <div className="p-6">
        <p className="text-danger text-sm">
          Error al cargar los datos. Por favor, intenta de nuevo.
        </p>
      </div>
    );
  }

  return (
    <StudentsClient students={students} plans={plans ?? []} total={students.length} />
  );
}
