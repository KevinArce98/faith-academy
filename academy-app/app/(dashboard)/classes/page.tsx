import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { ClassesClient } from '@/components/dashboard/ClassesClient';

export default async function ClassesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const [classes, teachers] = await Promise.all([
    db.class.findMany({
      where: {
        startsAt: { gte: weekStart, lte: weekEnd },
      },
      include: {
        _count: {
          select: {
            attendances: {
              where: { status: { in: ['RESERVED', 'ATTENDED'] } },
            },
          },
        },
      },
      orderBy: { startsAt: 'asc' },
    }),
    db.userProfile.findMany({
      where: { role: 'TEACHER' },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <ClassesClient
      classes={classes as never}
      teachers={teachers}
      weekStart={weekStart.toISOString()}
    />
  );
}
