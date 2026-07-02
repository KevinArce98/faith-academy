import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Hono } from 'hono';

import { db } from '../lib/db.js';
import { AppError, badRequest, forbidden, notFound } from '../lib/errors.js';
import { adminUserIds, notify } from '../lib/push.js';
import { parseBody } from '../lib/request.js';
import {
	createOrderSchema,
	rejectOrderSchema,
	uploadUrlSchema,
} from '../lib/validations/payments.js';
import { requireAuth, requireRole } from '../middleware/requireRole.js';
import { approveOrder, rejectOrder } from '../services/orders.js';
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

paymentsRoutes.get('/orders', requireAuth, async (c) => {
	const user = c.get('user');

	if (user.role === 'STUDENT') {
		const orders = await db.membershipOrder.findMany({
			where: { studentId: user.id },
			include: { plan: true, bookingClass: { select: { name: true } } },
			orderBy: { createdAt: 'desc' },
		});

		return c.json({ orders });
	}

	// Solo ADMIN ve las órdenes de pago de todos los alumnos.
	if (user.role !== 'ADMIN') throw forbidden();

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
});

paymentsRoutes.post('/orders', requireRole('STUDENT'), async (c) => {
	const user = c.get('user');
	const parsed = await parseBody(c, createOrderSchema);
	const { planId, receiptKey, bookingClassId, bookingDate } = parsed;

	// Validate receiptKey belongs to this user
	if (!receiptKey.startsWith(`receipts/${user.id}/`)) {
		throw badRequest('INVALID_RECEIPT', 'Comprobante inválido.');
	}

	const plan = await db.membershipPlan.findFirst({
		where: { id: planId, isActive: true },
	});
	if (!plan) throw notFound('Plan no encontrado.');

	// Clase suelta: el alumno debe elegir clase + fecha de la sesión.
	if (plan.isSingleClass) {
		if (!bookingClassId || !bookingDate) {
			throw badRequest(
				'BOOKING_REQUIRED',
				'Debes elegir la clase y la fecha de la sesión.',
			);
		}
		const cls = await db.class.findFirst({
			where: { id: bookingClassId, isActive: true },
			include: { slots: { select: { dayOfWeek: true } } },
		});
		if (!cls) throw notFound('Clase no encontrada.');
		// La fecha elegida debe caer en un día en que se imparte la clase.
		const [y, m, d] = bookingDate.split('-').map(Number);
		const jsDow = new Date(y, m - 1, d).getDay();
		const dow = jsDow === 0 ? 7 : jsDow; // 1=Lun … 7=Dom
		if (!cls.slots.some((s) => s.dayOfWeek === dow)) {
			throw badRequest(
				'INVALID_BOOKING_DATE',
				'La clase no se imparte el día seleccionado.',
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

	// Avisar a los admins que hay un comprobante por revisar (fire-and-forget).
	void adminUserIds().then((ids) =>
		notify(ids, {
			type: 'PAYMENT_SUBMITTED',
			title: 'Nuevo comprobante de pago',
			body: `${user.name ?? 'Un alumno'} envió un comprobante de ${plan.name}.`,
			data: { screen: 'payments' },
		}),
	);

	return c.json(order, 201);
});

paymentsRoutes.post('/orders/:id/approve', requireRole('ADMIN'), async (c) => {
	const admin = c.get('user');
	const updatedOrder = await approveOrder(c.req.param('id'), admin.id);
	return c.json(updatedOrder);
});

paymentsRoutes.post('/orders/:id/reject', requireRole('ADMIN'), async (c) => {
	const parsed = await parseBody(c, rejectOrderSchema);
	const updated = await rejectOrder(c.req.param('id'), parsed.notes);
	return c.json(updated);
});

paymentsRoutes.post('/upload-url', requireAuth, async (c) => {
	const user = c.get('user');
	const parsed = await parseBody(c, uploadUrlSchema);

	if (!BUCKET || !process.env.CLOUDFLARE_R2_ENDPOINT) {
		throw new AppError('R2_NOT_CONFIGURED', 500, 'R2 no configurado.');
	}

	const { studentId, ext } = parsed;

	// STUDENTs can only upload receipts for themselves
	if (user.role === 'STUDENT' && studentId !== user.id) {
		throw forbidden();
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

paymentsRoutes.post('/upload', requireAuth, async (c) => {
	const user = c.get('user');

	if (!BUCKET || !process.env.CLOUDFLARE_R2_ENDPOINT) {
		throw new AppError('R2_NOT_CONFIGURED', 500, 'R2 no configurado.');
	}

	let formData: FormData;
	try {
		formData = await c.req.formData();
	} catch {
		throw badRequest('INVALID_REQUEST', 'Formato de petición inválido.');
	}

	const file = formData.get('file');
	if (!(file instanceof File)) {
		throw new AppError('FILE_REQUIRED', 422, 'Se requiere un archivo.');
	}

	if (file.size > MAX_BYTES) {
		throw new AppError(
			'FILE_TOO_LARGE',
			413,
			'El archivo excede el tamaño máximo de 10 MB.',
		);
	}

	const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
	if (!ALLOWED_EXTS.has(ext)) {
		throw new AppError(
			'INVALID_FILE_TYPE',
			422,
			'Tipo de archivo no permitido. Usa JPG, PNG, WEBP o PDF.',
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
