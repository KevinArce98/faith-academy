import { db } from '../lib/db.js';
import { badRequest, conflict, notFound } from '../lib/errors.js';
import { notify } from '../lib/push.js';
import { addYears } from '../lib/utils/date.js';

// Matrícula anual por aniversario: un pago aprobado vale 1 año desde la
// aprobación. Espeja el flujo de services/orders.ts pero para EnrollmentPayment.

export type EnrollmentStatus = {
	fee: number | null;
	active: boolean;
	pending: boolean;
	expiresAt: string | null;
};

/** Estado de matrícula del alumno: monto configurado + si está al día/en revisión. */
export async function enrollmentStatus(
	studentId: string,
): Promise<EnrollmentStatus> {
	const now = new Date();
	const [student, current, pending] = await Promise.all([
		db.userProfile.findUnique({
			where: { id: studentId },
			select: { enrollmentFee: true },
		}),
		db.enrollmentPayment.findFirst({
			where: { studentId, status: 'ACTIVE', expiresAt: { gt: now } },
			orderBy: { expiresAt: 'desc' },
			select: { expiresAt: true },
		}),
		db.enrollmentPayment.findFirst({
			where: { studentId, status: 'PENDING_REVIEW' },
			select: { id: true },
		}),
	]);

	return {
		fee: student?.enrollmentFee != null ? Number(student.enrollmentFee) : null,
		active: !!current,
		pending: !!pending,
		expiresAt: current?.expiresAt?.toISOString() ?? null,
	};
}

export async function approveEnrollment(paymentId: string, adminId: string) {
	const payment = await db.enrollmentPayment.findUnique({
		where: { id: paymentId },
		include: { student: { select: { name: true } } },
	});
	if (!payment) throw notFound('Pago de matrícula no encontrado.');
	if (payment.status !== 'PENDING_REVIEW') {
		throw conflict(
			'ENROLLMENT_NOT_PENDING',
			'El pago no está en estado PENDING_REVIEW.',
		);
	}

	const now = new Date();
	const updated = await db.enrollmentPayment.update({
		where: { id: paymentId },
		data: {
			status: 'ACTIVE',
			startsAt: now,
			expiresAt: addYears(now, 1),
			approvedById: adminId,
			approvedAt: now,
		},
	});

	void notify([payment.studentId], {
		type: 'PAYMENT_STATUS',
		title: 'Matrícula aprobada',
		body: 'Tu pago de matrícula fue aprobado.',
		data: { screen: 'payments' },
	});

	return updated;
}

export async function rejectEnrollment(paymentId: string, notes?: string) {
	const payment = await db.enrollmentPayment.findUnique({
		where: { id: paymentId },
	});
	if (!payment) throw notFound('Pago de matrícula no encontrado.');
	if (payment.status !== 'PENDING_REVIEW') {
		throw conflict(
			'ENROLLMENT_NOT_PENDING',
			'El pago no está en estado PENDING_REVIEW.',
		);
	}

	const updated = await db.enrollmentPayment.update({
		where: { id: paymentId },
		data: { status: 'REJECTED', notes },
	});

	const reason = notes?.trim();
	void notify([payment.studentId], {
		type: 'PAYMENT_STATUS',
		title: 'Matrícula rechazada',
		body: reason
			? `Tu pago de matrícula fue rechazado: ${reason}`
			: 'Tu pago de matrícula fue rechazado. Sube un nuevo comprobante.',
		data: { screen: 'payments' },
	});

	return updated;
}

/**
 * El admin marca la matrícula del alumno como pagada (sin comprobante).
 * Requiere que el alumno tenga un monto de matrícula configurado (> 0).
 */
export async function markEnrollmentPaid(studentId: string, adminId: string) {
	const student = await db.userProfile.findFirst({
		where: { id: studentId, role: 'STUDENT' },
		select: { enrollmentFee: true },
	});
	if (!student) throw notFound('Alumno no encontrado.');

	const fee = student.enrollmentFee != null ? Number(student.enrollmentFee) : 0;
	if (fee <= 0) {
		throw badRequest(
			'NO_ENROLLMENT_FEE',
			'El alumno no tiene un monto de matrícula configurado.',
		);
	}

	const now = new Date();
	const created = await db.enrollmentPayment.create({
		data: {
			studentId,
			amount: fee,
			status: 'ACTIVE',
			startsAt: now,
			expiresAt: addYears(now, 1),
			approvedById: adminId,
			approvedAt: now,
		},
	});

	void notify([studentId], {
		type: 'PAYMENT_STATUS',
		title: 'Matrícula registrada',
		body: 'Tu matrícula quedó al día.',
		data: { screen: 'payments' },
	});

	return created;
}
