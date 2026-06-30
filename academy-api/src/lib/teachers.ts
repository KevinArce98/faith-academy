import { db } from './db.js';
import type { TeacherProfile } from './interfaces/teachers.js';
import { formatSlots } from './utils/schedule.js';

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
				maxCapacity: true,
				slots: {
					select: { dayOfWeek: true, startTime: true, endTime: true },
					orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
				},
				_count: {
					select: {
						attendances: {
							where: { status: { in: ['RESERVED', 'ATTENDED'] } },
						},
					},
				},
			},
			orderBy: { name: 'asc' },
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
				hourlyRate:
					teacher.hourlyRate != null ? Number(teacher.hourlyRate) : null,
				createdAt: teacher.createdAt.toISOString(),
				classes: (classesByTeacher.get(teacher.id) ?? []).map((cls) => ({
					id: cls.id,
					name: cls.name,
					schedule: formatSlots(cls.slots),
					capacity: cls.maxCapacity,
					attendanceCount: cls._count.attendances,
				})),
			}) satisfies TeacherProfile,
	);
}
