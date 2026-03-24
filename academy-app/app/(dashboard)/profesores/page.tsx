import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { getTeachersWithClasses } from '@/lib/teachers';
import { TeachersClient } from '@/components/dashboard/teachers/TeachersClient';

export default async function ProfesoresPage() {
  try {
    await requireRole('ADMIN');
  } catch {
    redirect('/');
  }

  const teachers = await getTeachersWithClasses();
  const activeCount = teachers.filter((t) => t.isActive).length;

  return <TeachersClient teachers={teachers} activeCount={activeCount} />;
}
