import { db } from '../lib/db.js';
import { conflict, notFound } from '../lib/errors.js';
import type { Prisma } from '../lib/generated/prisma/client.js';
import { invalidatePayouts } from '../lib/payouts.js';
import { notify } from '../lib/push.js';
import { addDays, addMonths, monthPeriod } from '../lib/utils/date.js';

// Aprobar un comprobante = el alumno pagó su mensualidad con el plan del
// comprobante. Un alumno tiene un solo plan por período (unique studentId+period).
export async function approveOrder(orderId: string, adminId: string) {
	const order = await db.membershipOrder.findUnique({
		where: { id: orderId },
		include: { plan: true },
	});

	if (!order) throw notFound('Orden no encontrada.');
	if (order.status !== 'PENDING_REVIEW') {
		throw conflict(
			'ORDER_NOT_PENDING',
			'La orden no está en estado PENDING_REVIEW.',
		);
	}

	const now = new Date();
	const isSingle = order.plan.isSingleClass;

	// Clase suelta: el ciclo es la fecha reservada (vence al terminar ese día) y
	// se auto-inscribe en esa clase para esa sesión. Mensual: ciclo por aniversario.
	const period =
		isSingle && order.bookingDate
			? monthPeriod(order.bookingDate)
			: monthPeriod(now);
	const expiresAt =
		isSingle && order.bookingDate
			? addDays(order.bookingDate, 1)
			: addMonths(now, 1);

	const ops: Prisma.PrismaPromise<unknown>[] = [
		db.membershipOrder.update({
			where: { id: orderId },
			data: {
				status: 'ACTIVE',
				startsAt: now,
				expiresAt,
				approvedById: adminId,
				approvedAt: now,
			},
		}),
		db.monthlySubscription.upsert({
			where: {
				studentId_period: { studentId: order.studentId, period },
			},
			create: {
				studentId: order.studentId,
				planId: order.planId,
				period,
				amount: order.plan.price,
				isPaid: true,
				paidAt: now,
				expiresAt,
			},
			update: {
				planId: order.planId,
				amount: order.plan.price,
				isPaid: true,
				paidAt: now,
				expiresAt,
			},
		}),
	];

	// Clase suelta: auto-inscribir en la clase reservada solo para esa fecha.
	if (isSingle && order.bookingClassId && order.bookingDate) {
		ops.push(
			db.monthlyAttendance.upsert({
				where: {
					studentId_classId_period: {
						studentId: order.studentId,
						classId: order.bookingClassId,
						period,
					},
				},
				create: {
					studentId: order.studentId,
					classId: order.bookingClassId,
					period,
					sessionDate: order.bookingDate,
				},
				update: { sessionDate: order.bookingDate },
			}),
		);
	}

	const [updatedOrder] = await db.$transaction(ops);

	// Fire-and-forget: notify() nunca lanza y no debe sumar latencia al request.
	void notify([order.studentId], {
		type: 'PAYMENT_STATUS',
		title: 'Pago aprobado',
		body: `Tu pago de ${order.plan.name} fue aprobado. ¡Ya puedes asistir!`,
		data: { screen: 'payments' },
	});

	invalidatePayouts();
	return updatedOrder;
}

export async function rejectOrder(orderId: string, notes?: string) {
	const order = await db.membershipOrder.findUnique({
		where: { id: orderId },
		include: { plan: { select: { name: true } } },
	});
	if (!order) throw notFound('Orden no encontrada.');
	if (order.status !== 'PENDING_REVIEW') {
		throw conflict(
			'ORDER_NOT_PENDING',
			'La orden no está en estado PENDING_REVIEW.',
		);
	}

	const updated = await db.membershipOrder.update({
		where: { id: orderId },
		data: { status: 'REJECTED', notes },
	});

	const reason = notes?.trim();
	void notify([order.studentId], {
		type: 'PAYMENT_STATUS',
		title: 'Pago rechazado',
		body: reason
			? `Tu pago de ${order.plan.name} fue rechazado: ${reason}`
			: `Tu pago de ${order.plan.name} fue rechazado. Sube un nuevo comprobante.`,
		data: { screen: 'payments' },
	});

	return updated;
}
