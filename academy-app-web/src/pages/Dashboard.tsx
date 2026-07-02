import { AdminDashboard } from '@/components/dashboard/AdminDashboard';
import { StudentDashboard } from '@/components/dashboard/StudentDashboard';
import { TeacherDashboard } from '@/components/dashboard/TeacherDashboard';
import { InlineSpinner } from '@/components/ui/Spinner';
import {
  useAdminDashboard,
  useMe,
  useStudentDashboard,
  useTeacherDashboard,
} from '@/lib/queries';

export default function Dashboard() {
  const { data: me, isLoading: meLoading } = useMe();
  const role = me?.role;

  const admin = useAdminDashboard(role);
  const teacher = useTeacherDashboard(role);
  const student = useStudentDashboard(role);

  const active =
    role === 'STUDENT' ? student : role === 'TEACHER' ? teacher : admin;

  if (meLoading || active.isLoading) {
    return <InlineSpinner />;
  }

  if (active.isError || !role) {
    return (
      <div className="p-6">
        <p className="text-danger text-sm">
          Error al cargar los datos. Por favor, intenta de nuevo.
        </p>
      </div>
    );
  }

  if (role === 'STUDENT' && student.data) {
    return <StudentDashboard {...student.data} />;
  }
  if (role === 'TEACHER' && teacher.data) {
    return <TeacherDashboard data={teacher.data} />;
  }
  if (admin.data) {
    return <AdminDashboard data={admin.data} />;
  }
  return <InlineSpinner />;
}
