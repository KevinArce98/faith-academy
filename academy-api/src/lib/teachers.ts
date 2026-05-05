import { db } from './db.js';
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
	// 2 queries instead of N+1: fetch all teachers, then batch-fetch all their classes
	const [teachers, allClasses] = await Promise.all([
		db.userProfile.findMany({
			where: { role: 'TEACHER' },
			orderBy: { name: 'asc' },
		}),
		db.class.findMany({
			where: { isActive: true },
			select: {
				id: true,
				name: true,
				teacherId: true,
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
		}),
	]);

	// Group classes by teacherId in memory
	const classesByTeacher = new Map<string, typeof allClasses>();
	for (const cls of allClasses) {
		const list = classesByTeacher.get(cls.teacherId) ?? [];
		list.push(cls);
		classesByTeacher.set(cls.teacherId, list);
	}

	return teachers.map(
		(teacher) =>
			({
				id: teacher.id,
				email: teacher.email,
				name: teacher.name,
				avatarUrl: teacher.avatarUrl,
				role: 'TEACHER',
				isActive: teacher.isActive,
				createdAt: teacher.createdAt.toISOString(),
				classes: (classesByTeacher.get(teacher.id) ?? []).map((cls) => ({
					id: cls.id,
					name: cls.name,
					dayOfWeek: formatDay(new Date(cls.startsAt)),
					startTime: formatTime(new Date(cls.startsAt)),
					endTime: formatTime(new Date(cls.endsAt)),
					capacity: cls.maxCapacity,
					attendanceCount: cls._count.attendances,
				})),
			}) satisfies TeacherProfile,
	);
}
