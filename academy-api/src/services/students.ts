import { badRequest } from '../lib/errors.js';
import { db } from '../lib/db.js';
import { Prisma } from '../lib/generated/prisma/client.js';
import { monthPeriod } from '../lib/utils/date.js';
import { generateTempPassword } from '../lib/utils/password.js';
import { hashPassword } from '../lib/utils/hash.js';

export type CreateStudentInput = {
	name: string;
	email: string;
	phone?: string | null;
	planId?: string | null;
	enrollmentFee?: number | null;
	enrolledAt?: string | null;
};

// Alta de alumno: perfil + matrícula + mensualidad del mes actual (si tiene
// plan), todo en una transacción para no dejar estados parciales.
export async function createStudent(input: CreateStudentInput) {
	const tempPassword = generateTempPassword();
	const passwordHash = await hashPassword(tempPassword);
	const planId = input.planId?.trim() || null;

	try {
		const created = await db.$transaction(async (tx) => {
			const user = await tx.userProfile.create({
				data: {
					email: input.email,
					name: input.name,
					role: 'STUDENT',
					passwordHash,
					emailVerified: true,
					phone: input.phone?.trim() || null,
					enrollmentFee: input.enrollmentFee ?? null,
					enrolledAt: input.enrolledAt ? new Date(input.enrolledAt) : null,
				},
			});

			if (planId) {
				const plan = await tx.membershipPlan.findUnique({
					where: { id: planId },
					select: { price: true },
				});
				if (plan) {
					await tx.monthlySubscription.create({
						data: {
							studentId: user.id,
							planId,
							period: monthPeriod(),
							amount: plan.price,
							isPaid: false,
						},
					});
				}
			}

			return user;
		});

		return { userId: created.id, tempPassword };
	} catch (err) {
		if (
			err instanceof Prisma.PrismaClientKnownRequestError &&
			err.code === 'P2002'
		) {
			throw badRequest('EMAIL_TAKEN', 'El correo ya está registrado.');
		}
		throw err;
	}
}

// Baja de alumno: soft delete. El historial (pagos, asistencias, mensualidades)
// se conserva; el alumno deja de poder iniciar sesión y de aparecer en listados.
export async function deactivateStudent(studentId: string) {
	await db.$transaction([
		db.userProfile.update({
			where: { id: studentId },
			data: { isActive: false },
		}),
		// Cerrar sesiones activas y tokens de push del alumno dado de baja.
		db.refreshToken.updateMany({
			where: { userId: studentId, revokedAt: null },
			data: { revokedAt: new Date() },
		}),
		db.pushToken.deleteMany({ where: { userId: studentId } }),
	]);
}
