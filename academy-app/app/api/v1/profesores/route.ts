import { requireRole } from '@/lib/auth';
import { getTeachersWithClasses } from '@/lib/teachers';

export async function GET() {
  await requireRole('ADMIN');
  const profesores = await getTeachersWithClasses();
  return Response.json(profesores);
}
