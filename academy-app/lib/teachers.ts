import { db } from '@/lib/db';
import type { TeacherProfile } from '@/interfaces/teachers';

const dayFormatter = new Intl.DateTimeFormat('es-CR', { weekday: 'short' });

function formatDay(date: Date): string {
  const raw = dayFormatter.format(date);
  if (!raw) return '';
  const cleaned = raw.replace('.', '');
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function formatTime(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const suffix = hours >= 12 ? 'pm' : 'am';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes}${suffix}`;
}

export async function getTeachersWithClasses(): Promise<TeacherProfile[]> {
  const teachers = await db.userProfile.findMany({
    where: { role: 'TEACHER' },
    orderBy: { name: 'asc' },
  });

  const profesores = await Promise.all(
    teachers.map(async (teacher) => {
      const clases = await db.class.findMany({
        where: { teacherId: teacher.id, isActive: true },
        select: {
          id: true,
          name: true,
          startsAt: true,
          endsAt: true,
          maxCapacity: true,
          _count: {
            select: {
              attendances: {
                where: { status: { in: ['RESERVED', 'ATTENDED'] } },
              },
            },
          },
        },
        orderBy: { startsAt: 'asc' },
      });

      const formattedClasses = clases.map((cls) => {
        const start = new Date(cls.startsAt);
        const end = new Date(cls.endsAt);
        return {
          id: cls.id,
          name: cls.name,
          dayOfWeek: formatDay(start),
          startTime: formatTime(start),
          endTime: formatTime(end),
          capacity: cls.maxCapacity,
          attendanceCount: cls._count.attendances,
        };
      });

      return {
        id: teacher.id,
        clerkId: teacher.clerkId,
        email: teacher.email,
        name: teacher.name,
        avatarUrl: teacher.avatarUrl,
        role: 'TEACHER',
        isActive: teacher.isActive,
        createdAt: teacher.createdAt.toISOString(),
        clases: formattedClasses,
      } satisfies TeacherProfile;
    })
  );

  return profesores;
}
