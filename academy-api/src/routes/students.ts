import { Hono } from 'hono';

import { createManagedUser } from '../lib/auth.js';
import { db } from '../lib/db.js';
import { parseJsonBody } from '../lib/request.js';
import { monthPeriod } from '../lib/utils/date.js';
import { generateTempPassword } from '../lib/utils/password.js';
import {
	createStudentSchema,
	updateStudentSchema,
} from '../lib/validations/students.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRoleMiddleware } from '../middleware/requireRole.js';
import type { AuthVariables } from '../types/auth.js';

const studentsRoutes = new Hono<{ Variables: AuthVariables }>();

studentsRoutes.get(
	'/',
	authMiddleware,
	requireRoleMiddleware(['ADMIN', 'TEACHER']),
	async (c) => {
		const students = await db.userProfile.findMany({
			where: { role: 'STUDENT' },
			include: {
				familyMember: {
					include: {
						family: { select: { name: true } },
					},
				},
				// Mensualidad/plan vigente (modelo flat-fee).
				subscriptions: {
					orderBy: { period: 'desc' },
					take: 1,
					include: {
						plan: { select: { id: true, name: true, isPublic: true } },
					},
				},
			},
			orderBy: { createdAt: 'desc' },
		});

		return c.json({ students });
	},
);

studentsRoutes.post(
	'/',
	authMiddleware,
	requireRoleMiddleware(['ADMIN', 'TEACHER']),
	async (c) => {
		const body = await parseJsonBody(c);
		const parsed = createStudentSchema.safeParse(body);
		if (!parsed.success) {
			return c.json({ success: false, error: parsed.error.flatten() }, 422);
		}

		const { name, email, phone, enrollmentFee, enrolledAt } = parsed.data;
		const planId = parsed.data.planId?.trim() || null;

		try {
			const tempPassword = generateTempPassword();

			const created = await createManagedUser({
				email,
				name,
				role: 'STUDENT',
				tempPassword,
				phone: phone?.trim() || null,
			});

			// Matrícula (pago único de inscripción).
			if (enrollmentFee != null || enrolledAt) {
				await db.userProfile.update({
					where: { id: created.id },
					data: {
						enrollmentFee: enrollmentFee ?? null,
						enrolledAt: enrolledAt ? new Date(enrolledAt) : null,
					},
				});
			}

			// Plan asignado → mensualidad del mes actual.
			if (planId) {
				const plan = await db.membershipPlan.findUnique({
					where: { id: planId },
					select: { price: true },
				});
				if (plan) {
					await db.monthlySubscription.create({
						data: {
							studentId: created.id,
							planId,
							period: monthPeriod(),
							amount: plan.price,
							isPaid: false,
						},
					});
				}
			}

			return c.json({ success: true, userId: created.id, tempPassword }, 201);
		} catch (err) {
			const message =
				err instanceof Error && err.message.includes('Unique')
					? 'El correo ya está registrado.'
					: 'Error al crear el alumno.';
			return c.json({ success: false, error: message }, 400);
		}
	},
);

studentsRoutes.put(
	'/:id',
	authMiddleware,
	requireRoleMiddleware(['ADMIN', 'TEACHER']),
	async (c) => {
		const body = await parseJsonBody(c);
		const parsed = updateStudentSchema.safeParse(body);
		if (!parsed.success) {
			return c.json({ success: false, error: parsed.error.flatten() }, 422);
		}

		const id = c.req.param('id');
		const student = await db.userProfile.findFirst({
			where: { id, role: 'STUDENT' },
		});

		if (!student) {
			return c.json({ success: false, error: 'Alumno no encontrado.' }, 404);
		}

		const name = parsed.data.name.replace(/\s+/g, ' ').trim();
		const email = parsed.data.email.trim().toLowerCase();
		const phone = parsed.data.phone?.trim() || null;
		const planId = parsed.data.planId?.trim() || null;
		const { enrollmentFee, enrolledAt } = parsed.data;

		// Perfil + matrícula.
		const updated = await db.userProfile.update({
			where: { id: student.id },
			data: {
				name,
				email,
				phone,
				...(enrollmentFee !== undefined
					? { enrollmentFee: enrollmentFee ?? null }
					: {}),
				...(enrolledAt !== undefined
					? { enrolledAt: enrolledAt ? new Date(enrolledAt) : null }
					: {}),
			},
		});

		// Plan asignado → upsert de la mensualidad del mes actual.
		if (planId) {
			const plan = await db.membershipPlan.findUnique({
				where: { id: planId },
				select: { price: true },
			});
			if (plan) {
				const period = monthPeriod();
				await db.monthlySubscription.upsert({
					where: { studentId_period: { studentId: student.id, period } },
					create: {
						studentId: student.id,
						planId,
						period,
						amount: plan.price,
						isPaid: false,
					},
					update: { planId, amount: plan.price },
				});
			}
		}

		return c.json({ success: true, student: updated, email });
	},
);

studentsRoutes.delete(
	'/:id',
	authMiddleware,
	requireRoleMiddleware(['ADMIN', 'TEACHER']),
	async (c) => {
		const id = c.req.param('id');
		const student = await db.userProfile.findFirst({
			where: { id, role: 'STUDENT' },
			select: { id: true, name: true },
		});

		if (!student) {
			return c.json({ success: false, error: 'Alumno no encontrado.' }, 404);
		}

		await db.$transaction([
			db.monthlyAttendance.deleteMany({ where: { studentId: student.id } }),
			db.monthlySubscription.deleteMany({ where: { studentId: student.id } }),
			db.creditLedger.deleteMany({ where: { studentId: student.id } }),
			db.classWaitlist.deleteMany({ where: { studentId: student.id } }),
			db.attendance.deleteMany({ where: { studentId: student.id } }),
			db.userSkill.deleteMany({ where: { studentId: student.id } }),
			db.streak.deleteMany({ where: { studentId: student.id } }),
			db.familyMember.deleteMany({ where: { studentId: student.id } }),
			db.membershipOrder.deleteMany({ where: { studentId: student.id } }),
			db.userProfile.delete({ where: { id: student.id } }),
		]);

		return c.json({ success: true });
	},
);

export default studentsRoutes;
