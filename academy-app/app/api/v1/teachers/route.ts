import { requireRole } from '@/lib/auth';
import { getTeachersWithClasses } from '@/lib/teachers';

export async function GET() {
  await requireRole('ADMIN');
  const teachers = await getTeachersWithClasses();
  return Response.json(teachers);
}
