import { Hono } from 'hono';

import { getCurrentUser, requireRole } from '../lib/auth.js';
import { type DbClient, db } from '../lib/db.js';
import { features } from '../lib/features.js';
import { generateQRPayload, verifyQRPayload } from '../lib/qr.js';
import { parseJsonBody } from '../lib/request.js';
import { promoteWaitlist } from '../lib/utils/waitlist.js';
import { authMiddleware } from '../middleware/auth.js';
import type { AuthVariables } from '../types/auth.js';

const attendanceRoutes = new Hono<{ Variables: AuthVariables }>();

// GET /student/qr — generate QR payload for current student
attendanceRoutes.get('/student/qr', authMiddleware, async (c) => {
	const user = await getCurrentUser(c);
	if (!user || user.role !== 'STUDENT') {
		return c.json({ error: 'UNAUTHORIZED' }, 401);
	}

	const payload = await generateQRPayload(user.id);

	const [activeOrder, latestLedger] = await Promise.all([
		db.membershipOrder.findFirst({
			where: {
				studentId: user.id,
				status: 'ACTIVE',
				expiresAt: { gt: new Date() },
			},
			include: { plan: true },
			orderBy: { expiresAt: 'desc' },
		}),
		db.creditLedger.findFirst({
			where: { studentId: user.id },
			orderBy: { createdAt: 'desc' },
		}),
	]);

	return c.json({
		payload,
		studentName: user.name,
		planName: activeOrder?.plan.name ?? null,
		credits: latestLedger?.balance ?? 0,
		expiresAt: activeOrder?.expiresAt ?? null,
		status: activeOrder?.status ?? null,
	});
});

// POST /attendance/scan — teacher scans student QR
attendanceRoutes.post('/attendance/scan', authMiddleware, async (c) => {
	if (!features.attendanceScanner) {
		return c.json({ error: 'Módulo no disponible' }, 403);
	}

	try {
		await requireRole(c, 'TEACHER');
	} catch (error) {
		const status =
			error instanceof Error && error.message === 'UNAUTHENTICATED' ? 401 : 403;
		return c.json({ error: 'No autorizado' }, status);
	}

	const body = await parseJsonBody(c);
	const token = (body as Record<string, unknown>)?.token;
	if (!token || typeof token !== 'string') {
		return c.json({ ok: false, reason: 'INVALID_QR' }, 400);
	}

	let qrPayload: { studentId: string };
	try {
		qrPayload = await verifyQRPayload(token);
	} catch {
		return c.json({ ok: false, reason: 'INVALID_QR' }, 400);
	}

	const { studentId } = qrPayload;

	try {
		const result = await db.$transaction(async (rawTx) => {
			// Cast to DbClient: Prisma 7 interactive transaction type differs from regular client
			const tx = rawTx as unknown as DbClient;
			const now = new Date();

			const activeOrder = await tx.membershipOrder.findFirst({
				where: {
					studentId,
					status: 'ACTIVE',
					expiresAt: { gt: now },
				},
				orderBy: { expiresAt: 'desc' },
			});

			if (!activeOrder) throw new Error('MEMBERSHIP_INACTIVE');

			// SELECT FOR UPDATE to prevent double-spend
			const ledgerRows = await tx.$queryRaw<{ id: string; balance: number }[]>`
				SELECT id, balance
				FROM "CreditLedger"
				WHERE "studentId" = ${studentId}
				ORDER BY "createdAt" DESC
				LIMIT 1
				FOR UPDATE
			`;

			const latestLedger = ledgerRows[0] ?? null;
			if (!latestLedger || latestLedger.balance <= 0)
				throw new Error('NO_CREDITS');

			const newBalance = latestLedger.balance - 1;

			const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
			const existingAttendance = await tx.attendance.findFirst({
				where: {
					studentId,
					status: { in: ['RESERVED', 'ATTENDED'] },
					class: {
						startsAt: { lte: twoHoursLater },
						endsAt: { gte: now },
					},
				},
				include: { class: true },
				orderBy: { createdAt: 'desc' },
			});

			if (existingAttendance) {
				await tx.attendance.update({
					where: { id: existingAttendance.id },
					data: { status: 'ATTENDED', checkedAt: now },
				});
			} else {
				const nextClass = await tx.class.findFirst({
					where: {
						isActive: true,
						startsAt: { lte: new Date(now.getTime() + 2 * 60 * 60 * 1000) },
						endsAt: { gte: now },
					},
					orderBy: { startsAt: 'asc' },
				});

				if (!nextClass) throw new Error('NO_ACTIVE_CLASS');

				await tx.attendance.create({
					data: {
						classId: nextClass.id,
						studentId,
						status: 'ATTENDED',
						checkedAt: now,
						creditDeducted: true,
					},
				});
			}

			await tx.creditLedger.create({
				data: {
					studentId,
					type: 'CREDIT_DEBIT',
					amount: 1,
					balance: newBalance,
					note: 'Asistencia por scanner QR',
				},
			});

			const msIn7Days = 7 * 24 * 60 * 60 * 1000;
			const nearExpiry =
				activeOrder.expiresAt != null &&
				activeOrder.expiresAt.getTime() - now.getTime() < msIn7Days;

			return { ok: true, balance: newBalance, nearExpiry };
		});

		// Fetch student profile outside the transaction — doesn't affect business logic
		const studentProfile = await db.userProfile.findUnique({
			where: { id: studentId },
			select: { name: true, avatarUrl: true },
		});

		return c.json({
			...result,
			student: {
				name: studentProfile?.name ?? '',
				avatarUrl: studentProfile?.avatarUrl ?? null,
			},
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : 'ERROR';
		const knownReasons = [
			'MEMBERSHIP_INACTIVE',
			'NO_CREDITS',
			'NO_ACTIVE_CLASS',
		];
		if (knownReasons.includes(message)) {
			return c.json({ ok: false, reason: message });
		}
		return c.json({ ok: false, reason: 'ERROR' }, 500);
	}
});

// POST /attendances/:id/cancel — cancel a reservation
attendanceRoutes.post('/attendances/:id/cancel', authMiddleware, async (c) => {
	let user;
	try {
		user = await requireRole(c, ['ADMIN', 'TEACHER', 'STUDENT']);
	} catch (error) {
		const status =
			error instanceof Error && error.message === 'UNAUTHENTICATED' ? 401 : 403;
		return c.json({ error: 'No autorizado' }, status);
	}

	const attendanceId = c.req.param('id');

	try {
		const result = await db.$transaction(async (rawTx) => {
			const tx = rawTx as unknown as DbClient;
			const attendance = await tx.attendance.findUnique({
				where: { id: attendanceId },
				include: { class: true },
			});

			if (!attendance) throw new Error('ATTENDANCE_NOT_FOUND');
			if (user.role === 'STUDENT' && attendance.studentId !== user.id)
				throw new Error('FORBIDDEN');
			if (attendance.status !== 'RESERVED') throw new Error('NOT_CANCELLABLE');

			const now = new Date();
			const hoursUntilClass =
				(attendance.class.startsAt.getTime() - now.getTime()) /
				(1000 * 60 * 60);
			const withinWindow =
				hoursUntilClass >= 0 &&
				hoursUntilClass >= attendance.class.cancelWindowHours;

			await tx.attendance.update({
				where: { id: attendanceId },
				data: { status: 'CANCELLED', cancelledAt: now },
			});

			let creditRefunded = false;

			if (withinWindow && attendance.creditDeducted) {
				const latestLedger = await tx.creditLedger.findFirst({
					where: { studentId: attendance.studentId },
					orderBy: { createdAt: 'desc' },
				});

				const currentBalance = latestLedger?.balance ?? 0;

				await tx.creditLedger.create({
					data: {
						studentId: attendance.studentId,
						attendanceId,
						type: 'CREDIT_REFUND',
						amount: 1,
						balance: currentBalance + 1,
						note: `Cancelación clase: ${attendance.class.name}`,
					},
				});

				creditRefunded = true;
				await promoteWaitlist(attendance.classId, tx);
			}

			return { cancelled: true, creditRefunded };
		});

		return c.json(result);
	} catch (err) {
		const message = err instanceof Error ? err.message : 'ERROR';
		const statusMap: Record<string, number> = {
			ATTENDANCE_NOT_FOUND: 404,
			FORBIDDEN: 403,
			NOT_CANCELLABLE: 409,
		};
		return c.json(
			{ error: message },
			(statusMap[message] ?? 500) as 403 | 404 | 409 | 500,
		);
	}
});

export default attendanceRoutes;
