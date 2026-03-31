import { db } from './db.js';
import type { UserProfile } from '../lib/generated/prisma/client.js';
import type { TeacherProfile } from './interfaces/teachers.js';

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

  return Promise.all(
    teachers.map(async (teacher: UserProfile) => {
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

      type ClsWithCount = (typeof clases)[number];
      const formattedClasses = clases.map((cls: ClsWithCount) => ({
        id: cls.id,
        name: cls.name,
        dayOfWeek: formatDay(new Date(cls.startsAt)),
        startTime: formatTime(new Date(cls.startsAt)),
        endTime: formatTime(new Date(cls.endsAt)),
        capacity: cls.maxCapacity,
        attendanceCount: cls._count.attendances,
      }));

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
    }),
  );
}
