import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { app } from './app';
import { db } from './lib/db';
import { signAccessToken } from './lib/jwt';

// ── Tests que NO tocan la DB (siempre corren) ───────────────────────────────
describe('app (sin DB)', () => {
	it('GET /health responde ok', async () => {
		const res = await app.request('/health');
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ ok: true });
	});

	it('endpoint protegido sin token → 401', async () => {
		const res = await app.request('/api/v1/payouts');
		expect(res.status).toBe(401);
	});
});

// ── Tests de integración del flujo de plata ─────────────────────────────────
// Requieren una DB de prueba MIGRADA. Activar con:
//   INTEGRATION_DB=1 TEST_DATABASE_URL="postgres://..." pnpm test
const RUN_DB = !!process.env.INTEGRATION_DB;

function currentMonth(): string {
	const now = new Date();
	return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

describe.runIf(RUN_DB)('flujo de plata (integración)', () => {
	const period = currentMonth();
	let adminToken = '';
	const ids = {
		admin: '',
		teacher: '',
		student: '',
		plan: '',
		class: '',
	};

	const auth = (path: string, init?: RequestInit) =>
		app.request(path, {
			...init,
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${adminToken}`,
				...init?.headers,
			},
		});

	beforeAll(async () => {
		if (!RUN_DB) return;
		const admin = await db.userProfile.create({
			data: {
				email: `admin+${crypto.randomUUID()}@test.local`,
				role: 'ADMIN',
				name: 'Admin Test',
				passwordHash: 'test',
				emailVerified: true,
			},
		});
		ids.admin = admin.id;
		adminToken = await signAccessToken({
			sub: admin.id,
			email: admin.email,
			role: 'ADMIN',
		});

		const teacher = await db.userProfile.create({
			data: {
				email: `teacher+${crypto.randomUUID()}@test.local`,
				role: 'TEACHER',
				name: 'Marta Test',
				passwordHash: 'test',
				emailVerified: true,
			},
		});
		ids.teacher = teacher.id;
	});

	afterAll(async () => {
		if (!RUN_DB) return;
		if (ids.student) {
			await db.monthlyAttendance.deleteMany({
				where: { studentId: ids.student },
			});
			await db.monthlySubscription.deleteMany({
				where: { studentId: ids.student },
			});
		}
		if (ids.class) await db.class.deleteMany({ where: { id: ids.class } });
		if (ids.plan)
			await db.membershipPlan.deleteMany({ where: { id: ids.plan } });
		await db.userProfile.deleteMany({
			where: {
				id: { in: [ids.student, ids.teacher, ids.admin].filter(Boolean) },
			},
		});
	});

	it('crea un plan', async () => {
		const res = await auth('/api/v1/plans', {
			method: 'POST',
			body: JSON.stringify({
				name: 'Plan Test',
				price: 40000,
				classesPerWeek: 2,
				isPublic: true,
				isSingleClass: false,
			}),
		});
		expect(res.status).toBe(201);
		const { plan } = await res.json();
		ids.plan = plan.id;
		expect(Number(plan.price)).toBe(40000);
	});

	it('crea una clase con profesor', async () => {
		const res = await auth('/api/v1/classes', {
			method: 'POST',
			body: JSON.stringify({
				name: 'Ballet Test',
				teacherId: ids.teacher,
				slots: [{ dayOfWeek: 1, startTime: '17:00', endTime: '18:00' }],
			}),
		});
		expect(res.status).toBe(201);
		const { class: cls } = await res.json();
		ids.class = cls.id;
	});

	it('crea un alumno con plan → genera mensualidad del mes', async () => {
		const res = await auth('/api/v1/students', {
			method: 'POST',
			body: JSON.stringify({
				name: 'Alumno Test',
				email: `student+${crypto.randomUUID()}@test.local`,
				planId: ids.plan,
				enrollmentFee: 12000,
			}),
		});
		expect(res.status).toBe(201);
		const { userId } = await res.json();
		ids.student = userId;

		const subsRes = await auth(
			`/api/v1/subscriptions?studentId=${ids.student}`,
		);
		const { subscriptions } = await subsRes.json();
		expect(subscriptions).toHaveLength(1);
		expect(subscriptions[0].isPaid).toBe(false);
	});

	it('marca la mensualidad como pagada y la asistencia a la clase', async () => {
		const subsRes = await auth(
			`/api/v1/subscriptions?studentId=${ids.student}`,
		);
		const { subscriptions } = await subsRes.json();
		const subId = subscriptions[0].id;

		const payRes = await auth(`/api/v1/subscriptions/${subId}/pay`, {
			method: 'PATCH',
			body: JSON.stringify({ isPaid: true }),
		});
		expect(payRes.status).toBe(200);

		const attRes = await auth('/api/v1/monthly-attendance', {
			method: 'POST',
			body: JSON.stringify({
				studentId: ids.student,
				classId: ids.class,
				period,
			}),
		});
		expect(attRes.status).toBe(201);
	});

	it('el reporte de payouts paga la mensualidad completa al profe', async () => {
		const res = await auth(`/api/v1/payouts?period=${period}`);
		expect(res.status).toBe(200);
		const data = await res.json();

		expect(data.totals.collected).toBe(40000);
		const marta = data.payouts.find(
			(p: { teacherId: string }) => p.teacherId === ids.teacher,
		);
		expect(marta).toBeTruthy();
		expect(marta.total).toBe(40000);
	});
});
