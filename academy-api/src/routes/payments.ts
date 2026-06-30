import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Hono } from 'hono';

import { getCurrentUser } from '../lib/auth.js';
import { authorizeRole } from '../lib/authorize.js';
import { db } from '../lib/db.js';
import { Prisma } from '../lib/generated/prisma/client.js';
import { invalidatePayouts } from '../lib/payouts.js';
import { parseJsonBody } from '../lib/request.js';
import { addDays, addMonths, monthPeriod } from '../lib/utils/date.js';
import {
	createOrderSchema,
	rejectOrderSchema,
	uploadUrlSchema,
} from '../lib/validations/payments.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRoleMiddleware } from '../middleware/requireRole.js';
import type { AuthVariables } from '../types/auth.js';

const paymentsRoutes = new Hono<{ Variables: AuthVariables }>();

let _r2: S3Client | null = null;
function getR2(): S3Client {
	if (_r2) return _r2;
	_r2 = new S3Client({
		region: 'auto',
		endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
		credentials: {
			accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ?? '',
			secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ?? '',
		},
	});
	return _r2;
}

const BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME ?? '';
const EXPIRES_IN = 300;
const ALLOWED_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'pdf']);
const MAX_BYTES = 10 * 1024 * 1024;

paymentsRoutes.get('/orders', authMiddleware, async (c) => {
	const user = await getCurrentUser(c);
	if (!user) {
		return c.json({ error: 'UNAUTHENTICATED' }, 401);
	}

	if (user.role === 'STUDENT') {
		const orders = await db.membershipOrder.findMany({
			where: { studentId: user.id },
			include: { plan: true, bookingClass: { select: { name: true } } },
			orderBy: { createdAt: 'desc' },
		});

		return c.json({ orders });
	}

	if (user.role === 'ADMIN' || user.role === 'TEACHER') {
		const orders = await db.membershipOrder.findMany({
			include: {
				plan: true,
				student: {
					select: { id: true, name: true, email: true },
				},
				bookingClass: { select: { name: true } },
			},
			orderBy: { createdAt: 'desc' },
		});

		return c.json({ orders });
	}

	return c.json({ error: 'No autorizado' }, 403);
});

paymentsRoutes.post('/orders', authMiddleware, async (c) => {
	const auth = await authorizeRole(c, 'STUDENT');
	if (auth.error) return auth.error;
	const user = auth.user;

	const body = await parseJsonBody(c);
	const parsed = createOrderSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: parsed.error.flatten() }, 422);
	}

	const { planId, receiptKey, bookingClassId, bookingDate } = parsed.data;

	// Validate receiptKey belongs to this user
	if (!receiptKey.startsWith(`receipts/${user.id}/`)) {
		return c.json({ error: 'Comprobante inválido' }, 422);
	}

	const plan = await db.membershipPlan.findFirst({
		where: { id: planId, isActive: true },
	});

	if (!plan) {
		return c.json({ error: 'Plan no encontrado' }, 404);
	}

	// Clase suelta: el alumno debe elegir clase + fecha de la sesión.
	if (plan.isSingleClass) {
		if (!bookingClassId || !bookingDate) {
			return c.json(
				{ error: 'Debes elegir la clase y la fecha de la sesión.' },
				422,
			);
		}
		const cls = await db.class.findFirst({
			where: { id: bookingClassId, isActive: true },
			include: { slots: { select: { dayOfWeek: true } } },
		});
		if (!cls) return c.json({ error: 'Clase no encontrada.' }, 404);
		// La fecha elegida debe caer en un día en que se imparte la clase.
		const [y, m, d] = bookingDate.split('-').map(Number);
		const jsDow = new Date(y, m - 1, d).getDay();
		const dow = jsDow === 0 ? 7 : jsDow; // 1=Lun … 7=Dom
		if (!cls.slots.some((s) => s.dayOfWeek === dow)) {
			return c.json(
				{ error: 'La clase no se imparte el día seleccionado.' },
				422,
			);
		}
	}

	const receiptUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${receiptKey}`;

	const order = await db.membershipOrder.create({
		data: {
			studentId: user.id,
			planId,
			receiptUrl,
			status: 'PENDING_REVIEW',
			bookingClassId: plan.isSingleClass ? bookingClassId : null,
			bookingDate: plan.isSingleClass
				? new Date(`${bookingDate}T00:00:00.000Z`)
				: null,
		},
	});

	return c.json(order, 201);
});

paymentsRoutes.post('/orders/:id/approve', authMiddleware, async (c) => {
	const auth = await authorizeRole(c, 'ADMIN');
	if (auth.error) return auth.error;
	const admin = auth.user;

	const id = c.req.param('id');
	const order = await db.membershipOrder.findUnique({
		where: { id },
		include: { plan: true },
	});

	if (!order) {
		return c.json({ error: 'Orden no encontrada' }, 404);
	}

	if (order.status !== 'PENDING_REVIEW') {
		return c.json({ error: 'La orden no está en estado PENDING_REVIEW' }, 409);
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

	// Aprobar un comprobante = el alumno pagó su mensualidad con el plan del
	// comprobante. Un alumno tiene un solo plan por período (unique studentId+period).
	const ops: Prisma.PrismaPromise<unknown>[] = [
		db.membershipOrder.update({
			where: { id },
			data: {
				status: 'ACTIVE',
				startsAt: now,
				expiresAt,
				approvedById: admin.id,
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

	invalidatePayouts();
	return c.json(updatedOrder);
});

paymentsRoutes.post(
	'/orders/:id/reject',
	authMiddleware,
	requireRoleMiddleware('ADMIN'),
	async (c) => {
		const id = c.req.param('id');

		const body = await parseJsonBody(c);
		const parsed = rejectOrderSchema.safeParse(body ?? {});
		if (!parsed.success) {
			return c.json({ error: parsed.error.flatten() }, 422);
		}

		const order = await db.membershipOrder.findUnique({ where: { id } });
		if (!order) {
			return c.json({ error: 'Orden no encontrada' }, 404);
		}

		if (order.status !== 'PENDING_REVIEW') {
			return c.json(
				{ error: 'La orden no está en estado PENDING_REVIEW' },
				409,
			);
		}

		const updated = await db.membershipOrder.update({
			where: { id },
			data: {
				status: 'REJECTED',
				notes: parsed.data.notes,
			},
		});

		return c.json(updated);
	},
);

paymentsRoutes.post('/upload-url', authMiddleware, async (c) => {
	const user = await getCurrentUser(c);
	if (!user) {
		return c.json({ error: 'No autenticado' }, 401);
	}

	const body = await parseJsonBody(c);
	const parsed = uploadUrlSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: parsed.error.flatten() }, 422);
	}

	if (!BUCKET || !process.env.CLOUDFLARE_R2_ENDPOINT) {
		return c.json({ error: 'R2 no configurado' }, 500);
	}

	const { studentId, ext } = parsed.data;

	// STUDENTs can only upload receipts for themselves
	if (user.role === 'STUDENT' && studentId !== user.id) {
		return c.json({ error: 'No autorizado' }, 403);
	}

	const key = `receipts/${user.id}/${studentId}/${Date.now()}.${ext}`;

	const command = new PutObjectCommand({
		Bucket: BUCKET,
		Key: key,
	});

	const uploadUrl = await getSignedUrl(getR2(), command, {
		expiresIn: EXPIRES_IN,
	});
	return c.json({ uploadUrl, key });
});

paymentsRoutes.post('/upload', authMiddleware, async (c) => {
	const user = await getCurrentUser(c);
	if (!user) {
		return c.json({ error: 'No autenticado' }, 401);
	}

	if (!BUCKET || !process.env.CLOUDFLARE_R2_ENDPOINT) {
		return c.json({ error: 'R2 no configurado' }, 500);
	}

	let formData: FormData;
	try {
		formData = await c.req.formData();
	} catch {
		return c.json({ error: 'Formato de petición inválido' }, 400);
	}

	const file = formData.get('file');
	if (!(file instanceof File)) {
		return c.json({ error: 'Se requiere un archivo' }, 422);
	}

	if (file.size > MAX_BYTES) {
		return c.json(
			{ error: 'El archivo excede el tamaño máximo de 10 MB' },
			413,
		);
	}

	const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
	if (!ALLOWED_EXTS.has(ext)) {
		return c.json(
			{ error: 'Tipo de archivo no permitido. Usa JPG, PNG, WEBP o PDF' },
			422,
		);
	}

	const key = `receipts/${user.id}/${Date.now()}.${ext}`;
	const buffer = Buffer.from(await file.arrayBuffer());

	await getR2().send(
		new PutObjectCommand({
			Bucket: BUCKET,
			Key: key,
			Body: buffer,
			ContentType: file.type,
		}),
	);

	return c.json({ key });
});

export default paymentsRoutes;
