import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Hono } from 'hono';

import { db } from '../lib/db.js';
import { AppError, badRequest, conflict, forbidden, notFound } from '../lib/errors.js';
import { adminUserIds, notify } from '../lib/push.js';
import { parseBody } from '../lib/request.js';
import { getR2, R2_BUCKET, R2_UPLOAD_EXPIRES_IN } from '../lib/r2.js';
import { detectedUploadType } from '../lib/uploads.js';
import {
	createEnrollmentSchema,
	createOrderSchema,
	markEnrollmentPaidSchema,
	rejectOrderSchema,
	uploadUrlSchema,
} from '../lib/validations/payments.js';
import { requireAuth, requireRole } from '../middleware/requireRole.js';
import {
	approveEnrollment,
	enrollmentStatus,
	markEnrollmentPaid,
	rejectEnrollment,
} from '../services/enrollment.js';
import { approveOrder, rejectOrder } from '../services/orders.js';
import type { AuthVariables } from '../types/auth.js';

// Ítem normalizado del listado de pagos: plan (mensualidad/clase suelta) o
// matrícula. La matrícula sintetiza un `plan` para que la UI la renderice igual.
type PlanItemSource = {
	id: string;
	status: string;
	createdAt: Date;
	approvedAt: Date | null;
	receiptUrl: string | null;
	expiresAt: Date | null;
	notes: string | null;
	bookingDate: Date | null;
	bookingClass: { name: string } | null;
	plan: { id: string; name: string; price: unknown };
	student?: { id: string; name: string | null; avatarUrl: string | null; email: string };
};

type EnrollmentItemSource = {
	id: string;
	amount: unknown;
	status: string;
	createdAt: Date;
	approvedAt: Date | null;
	receiptUrl: string | null;
	expiresAt: Date | null;
	notes: string | null;
	student?: { id: string; name: string | null; avatarUrl: string | null; email: string };
};

function planItem(o: PlanItemSource) {
	return { ...o, kind: 'PLAN' as const };
}

function enrollmentItem(e: EnrollmentItemSource) {
	return {
		id: e.id,
		kind: 'ENROLLMENT' as const,
		status: e.status,
		createdAt: e.createdAt,
		approvedAt: e.approvedAt,
		receiptUrl: e.receiptUrl,
		expiresAt: e.expiresAt,
		notes: e.notes,
		bookingDate: null,
		bookingClass: null,
		...(e.student ? { student: e.student } : {}),
		plan: { id: '', name: 'Matrícula', price: Number(e.amount) },
	};
}

function sortByCreatedDesc<T extends { createdAt: Date }>(items: T[]): T[] {
	return items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

const paymentsRoutes = new Hono<{ Variables: AuthVariables }>();

const BUCKET = R2_BUCKET;
const EXPIRES_IN = R2_UPLOAD_EXPIRES_IN;
const ALLOWED_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'pdf']);
const MAX_BYTES = 10 * 1024 * 1024;

paymentsRoutes.get('/orders', requireAuth, async (c) => {
	const user = c.get('user');

	if (user.role === 'STUDENT') {
		const [orders, enrollments] = await Promise.all([
			db.membershipOrder.findMany({
				where: { studentId: user.id },
				include: { plan: true, bookingClass: { select: { name: true } } },
			}),
			db.enrollmentPayment.findMany({ where: { studentId: user.id } }),
		]);

		const items = sortByCreatedDesc([
			...orders.map(planItem),
			...enrollments.map(enrollmentItem),
		]);
		return c.json({ orders: items });
	}

	// Solo ADMIN ve los pagos de todos los alumnos.
	if (user.role !== 'ADMIN') throw forbidden();

	const studentSelect = { select: { id: true, name: true, avatarUrl: true, email: true } };
	const [orders, enrollments] = await Promise.all([
		db.membershipOrder.findMany({
			include: {
				plan: true,
				student: studentSelect,
				bookingClass: { select: { name: true } },
			},
		}),
		db.enrollmentPayment.findMany({ include: { student: studentSelect } }),
	]);

	const items = sortByCreatedDesc([
		...orders.map(planItem),
		...enrollments.map(enrollmentItem),
	]);
	return c.json({ orders: items });
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

// ── Matrícula (anual, por aniversario) ──────────────────────────────────────

// Estado de matrícula del alumno (para mostrar/ocultar "Pagar mi matrícula").
paymentsRoutes.get('/enrollment/me', requireRole('STUDENT'), async (c) => {
	const user = c.get('user');
	return c.json(await enrollmentStatus(user.id));
});

// Estado de matrícula de un alumno (lo consulta el admin en la ficha).
paymentsRoutes.get(
	'/enrollment/status/:studentId',
	requireRole('ADMIN'),
	async (c) => {
		return c.json(await enrollmentStatus(c.req.param('studentId')));
	},
);

// El alumno sube el comprobante de su matrícula (monto = su enrollmentFee).
paymentsRoutes.post('/enrollment', requireRole('STUDENT'), async (c) => {
	const user = c.get('user');
	const { receiptKey } = await parseBody(c, createEnrollmentSchema);

	if (!receiptKey.startsWith(`receipts/${user.id}/`)) {
		throw badRequest('INVALID_RECEIPT', 'Comprobante inválido.');
	}

	const profile = await db.userProfile.findUnique({
		where: { id: user.id },
		select: { enrollmentFee: true, name: true },
	});
	const fee = profile?.enrollmentFee != null ? Number(profile.enrollmentFee) : 0;
	if (fee <= 0) {
		throw badRequest(
			'NO_ENROLLMENT_FEE',
			'No tienes un monto de matrícula configurado. Contacta al administrador.',
		);
	}

	// No permitir un segundo pago si ya hay uno pendiente o una matrícula vigente.
	const now = new Date();
	const existing = await db.enrollmentPayment.findFirst({
		where: {
			studentId: user.id,
			OR: [
				{ status: 'PENDING_REVIEW' },
				{ status: 'ACTIVE', expiresAt: { gt: now } },
			],
		},
	});
	if (existing) {
		throw conflict(
			'ENROLLMENT_ALREADY',
			existing.status === 'PENDING_REVIEW'
				? 'Ya tienes un pago de matrícula en revisión.'
				: 'Tu matrícula ya está al día.',
		);
	}

	const receiptUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${receiptKey}`;
	const payment = await db.enrollmentPayment.create({
		data: { studentId: user.id, amount: fee, receiptUrl, status: 'PENDING_REVIEW' },
	});

	void adminUserIds().then((ids) =>
		notify(ids, {
			type: 'PAYMENT_SUBMITTED',
			title: 'Nuevo comprobante de matrícula',
			body: `${profile?.name ?? 'Un alumno'} envió el comprobante de su matrícula.`,
			data: { screen: 'payments' },
		}),
	);

	return c.json(payment, 201);
});

paymentsRoutes.post(
	'/enrollment/mark-paid',
	requireRole('ADMIN'),
	async (c) => {
		const admin = c.get('user');
		const { studentId } = await parseBody(c, markEnrollmentPaidSchema);
		const created = await markEnrollmentPaid(studentId, admin.id);
		return c.json(created, 201);
	},
);

paymentsRoutes.post(
	'/enrollment/:id/approve',
	requireRole('ADMIN'),
	async (c) => {
		const admin = c.get('user');
		const updated = await approveEnrollment(c.req.param('id'), admin.id);
		return c.json(updated);
	},
);

paymentsRoutes.post(
	'/enrollment/:id/reject',
	requireRole('ADMIN'),
	async (c) => {
		const parsed = await parseBody(c, rejectOrderSchema);
		const updated = await rejectEnrollment(c.req.param('id'), parsed.notes);
		return c.json(updated);
	},
);

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

	const buffer = Buffer.from(await file.arrayBuffer());
	const detected = detectedUploadType(buffer.subarray(0, 16), ALLOWED_EXTS);
	if (!detected) {
		throw new AppError(
			'INVALID_FILE_TYPE',
			422,
			'Tipo de archivo no permitido. Usa JPG, PNG, WEBP o PDF.',
		);
	}

	const key = `receipts/${user.id}/${Date.now()}.${detected.ext}`;

	await getR2().send(
		new PutObjectCommand({
			Bucket: BUCKET,
			Key: key,
			Body: buffer,
			ContentType: detected.contentType,
			ContentDisposition: 'attachment',
		}),
	);

	return c.json({ key });
});

export default paymentsRoutes;
