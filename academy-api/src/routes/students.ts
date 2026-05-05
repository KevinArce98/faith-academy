import { Hono } from 'hono';

import { createManagedUser } from '../lib/auth.js';
import { db } from '../lib/db.js';
import { parseJsonBody } from '../lib/request.js';
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
				orders: {
					orderBy: { createdAt: 'desc' },
					take: 1,
					include: {
						plan: { select: { id: true, name: true } },
						ledgerEntries: {
							orderBy: { createdAt: 'desc' },
							take: 1,
							select: { balance: true },
						},
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

		const { name, email, notes, phone } = parsed.data;
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

			if (planId) {
				await db.membershipOrder.create({
					data: {
						studentId: created.id,
						planId,
						status: 'PENDING_REVIEW',
						notes: notes?.trim() ? notes.trim() : null,
					},
				});
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
			include: {
				orders: { orderBy: { createdAt: 'desc' }, take: 1 },
			},
		});

		if (!student) {
			return c.json({ success: false, error: 'Alumno no encontrado.' }, 404);
		}

		const name = parsed.data.name.replace(/\s+/g, ' ').trim();
		const email = parsed.data.email.trim().toLowerCase();
		const phone = parsed.data.phone?.trim() || null;
		const planId = parsed.data.planId?.trim() || null;
		const notes = parsed.data.notes?.trim() || null;

		const currentName = student.name ?? '';
		const currentEmail = student.email.trim().toLowerCase();
		const currentPhone = student.phone?.trim() || null;
		const latestOrder = student.orders[0] ?? null;

		const hasProfileChanges =
			name !== currentName || email !== currentEmail || phone !== currentPhone;
		const planChanged = Boolean(planId && latestOrder?.planId !== planId);
		const notesChanged =
			latestOrder != null && (latestOrder.notes ?? null) !== notes;
		const hasMembershipChanges = planChanged || notesChanged;

		if (!hasProfileChanges && !hasMembershipChanges) {
			return c.json(
				{ success: false, error: 'No hay cambios para aplicar.' },
				400,
			);
		}

		let updated = student;
		if (hasProfileChanges) {
			updated = await db.userProfile.update({
				where: { id: student.id },
				data: { name, email, phone },
				include: { orders: { orderBy: { createdAt: 'desc' }, take: 1 } },
			});
		}

		if (planId) {
			if (latestOrder && latestOrder.status === 'PENDING_REVIEW') {
				await db.membershipOrder.update({
					where: { id: latestOrder.id },
					data: { planId, notes },
				});
			} else if (latestOrder && latestOrder.planId === planId) {
				await db.membershipOrder.update({
					where: { id: latestOrder.id },
					data: { notes },
				});
			} else {
				await db.membershipOrder.create({
					data: {
						studentId: student.id,
						planId,
						status: 'PENDING_REVIEW',
						notes,
					},
				});
			}
		} else if (notesChanged && latestOrder) {
			await db.membershipOrder.update({
				where: { id: latestOrder.id },
				data: { notes },
			});
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
