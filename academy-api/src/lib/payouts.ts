import { db } from './db.js';
import { type PayoutResult, reducePayouts } from './payouts-core.js';

export * from './payouts-core.js';

const LEVEL_ES: Record<string, string> = {
	BEGINNER: 'Básico',
	INTERMEDIATE: 'Intermedio',
	ADVANCED: 'Avanzado',
	MASTER: 'Máster',
};

function classDisplayName(name: string, skillLevel: string): string {
	const level = LEVEL_ES[skillLevel];
	return level ? `${name} · ${level}` : name;
}

function parseMins(time: string): number {
	const [h, m] = time.split(':').map(Number);
	return h * 60 + (m ?? 0);
}

const PAYOUTS_TTL_MS = 60_000;
const payoutsCache = new Map<string, { at: number; data: PayoutResult }>();

export function invalidatePayouts(): void {
	payoutsCache.clear();
}

export async function computePayouts(period: Date): Promise<PayoutResult> {
	const key = period.toISOString();
	const hit = payoutsCache.get(key);
	if (hit && Date.now() - hit.at < PAYOUTS_TTL_MS) return hit.data;
	const data = await computePayoutsUncached(period);
	payoutsCache.set(key, { at: Date.now(), data });
	return data;
}

async function computePayoutsUncached(period: Date): Promise<PayoutResult> {
	const nextMonthStart = new Date(
		Date.UTC(period.getUTCFullYear(), period.getUTCMonth() + 1, 1),
	);

	const [subs, attendance, classes, teachers, sessionRows, classSlots] =
		await Promise.all([
			db.monthlySubscription.findMany({
				where: { period },
				select: {
					studentId: true,
					amount: true,
					isPaid: true,
					plan: { select: { name: true } },
					student: { select: { name: true } },
				},
			}),
			db.monthlyAttendance.findMany({
				where: { period },
				select: { studentId: true, classId: true },
			}),
			db.class.findMany({
				select: { id: true, name: true, teacherId: true, skillLevel: true },
			}),
			// Admins + profesores: un admin también puede impartir clases.
			db.userProfile.findMany({
				where: { role: { in: ['ADMIN', 'TEACHER'] } },
				select: { id: true, name: true, hourlyRate: true },
			}),
			// Asistencia real de sesiones en el mes para contar fechas distintas por clase
			db.sessionAttendance.findMany({
				where: { date: { gte: period, lt: nextMonthStart } },
				select: { classId: true, date: true },
			}),
			// Slots para calcular duración promedio por clase
			db.classSlot.findMany({
				select: { classId: true, startTime: true, endTime: true },
			}),
		]);

	// Fechas distintas por clase → cantidad de sesiones dadas
	const sessionDates = new Map<string, Set<string>>();
	for (const row of sessionRows) {
		const dateStr = row.date.toISOString().slice(0, 10);
		const set = sessionDates.get(row.classId) ?? new Set<string>();
		set.add(dateStr);
		sessionDates.set(row.classId, set);
	}

	// Duración promedio de slot por clase (en minutos)
	const slotTotals = new Map<string, { totalMins: number; count: number }>();
	for (const slot of classSlots) {
		const dur = parseMins(slot.endTime) - parseMins(slot.startTime);
		if (dur <= 0) continue;
		const prev = slotTotals.get(slot.classId) ?? { totalMins: 0, count: 0 };
		slotTotals.set(slot.classId, {
			totalMins: prev.totalMins + dur,
			count: prev.count + 1,
		});
	}

	const sessions = [...sessionDates.entries()].map(([classId, dates]) => {
		const slot = slotTotals.get(classId);
		const durationMinutes = slot ? Math.round(slot.totalMins / slot.count) : 60;
		return { classId, durationMinutes, count: dates.size };
	});

	return reducePayouts({
		subscriptions: subs.map((s) => ({
			studentId: s.studentId,
			amount: Number(s.amount),
			isPaid: s.isPaid,
			studentName: s.student.name ?? '',
			planName: s.plan.name,
		})),
		attendance,
		classes: classes.map((cl) => ({
			id: cl.id,
			teacherId: cl.teacherId,
			name: classDisplayName(cl.name, cl.skillLevel),
		})),
		teachers: teachers.map((t) => ({
			id: t.id,
			name: t.name,
			hourlyRate: t.hourlyRate != null ? Number(t.hourlyRate) : null,
		})),
		sessions,
	});
}
