import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { getCurrentUser } from '../lib/auth.js';
import { db } from '../lib/db.js';
import type { AuthVariables } from '../types/auth.js';

const notificationsRoutes = new Hono<{ Variables: AuthVariables }>();

type NotificationType =
  | 'PENDING_PAYMENT'
  | 'EXPIRING_MEMBERSHIP'
  | 'CLASS_CAPACITY'
  | 'PAYMENT_STATUS';

type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string;
};

// GET /notifications
notificationsRoutes.get('/', authMiddleware, async (c) => {
  const user = await getCurrentUser(c);
  if (!user) return c.json({ error: 'UNAUTHENTICATED' }, 401);

  const now = new Date();
  const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const notifications: Notification[] = [];

  if (user.role === 'ADMIN' || user.role === 'TEACHER') {
    const [pendingOrders, expiringOrders, nearlyFullClasses] = await Promise.all([
      db.membershipOrder.findMany({
        where: { status: 'PENDING_REVIEW' },
        include: {
          student: { select: { name: true } },
          plan: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      db.membershipOrder.findMany({
        where: { status: 'ACTIVE', expiresAt: { lte: in7days, gte: now } },
        include: {
          student: { select: { name: true } },
          plan: { select: { name: true } },
        },
        orderBy: { expiresAt: 'asc' },
        take: 20,
      }),
      db.class.findMany({
        where: { isActive: true },
        include: {
          _count: { select: { attendances: { where: { status: { in: ['RESERVED', 'ATTENDED'] } } } } },
        },
        orderBy: { startsAt: 'asc' },
        take: 30,
      }),
    ]);

    for (const order of pendingOrders) {
      notifications.push({
        id: `pending-${order.id}`,
        type: 'PENDING_PAYMENT',
        title: 'Pago pendiente de aprobación',
        body: `${order.student?.name ?? 'Alumno'} solicitó ${order.plan?.name ?? 'un plan'}`,
        createdAt: order.createdAt.toISOString(),
      });
    }

    for (const order of expiringOrders) {
      const daysLeft = Math.ceil(
        (order.expiresAt!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      notifications.push({
        id: `expiring-${order.id}`,
        type: 'EXPIRING_MEMBERSHIP',
        title: 'Membresía por vencer',
        body: `${order.student?.name ?? 'Alumno'} — vence en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}`,
        createdAt: order.expiresAt!.toISOString(),
      });
    }

    for (const cls of nearlyFullClasses) {
      if (!cls.maxCapacity || cls.maxCapacity <= 0) continue;
      const pct = cls._count.attendances / cls.maxCapacity;
      if (pct < 0.8) continue;
      const isFull = pct >= 1;
      notifications.push({
        id: `capacity-${cls.id}`,
        type: 'CLASS_CAPACITY',
        title: isFull ? 'Clase llena' : 'Clase casi llena',
        body: `${cls.name} — ${cls._count.attendances}/${cls.maxCapacity} cupos`,
        createdAt: cls.startsAt.toISOString(),
      });
    }
  } else {
    // STUDENT: own payment status + expiring membership
    const [pendingStudentOrders, rejectedOrders, expiringOrder] = await Promise.all([
      db.membershipOrder.findMany({
        where: { studentId: user.id, status: 'PENDING_REVIEW' },
        include: { plan: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      db.membershipOrder.findMany({
        where: { studentId: user.id, status: 'REJECTED' },
        include: { plan: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 3,
      }),
      db.membershipOrder.findFirst({
        where: { studentId: user.id, status: 'ACTIVE', expiresAt: { lte: in7days, gte: now } },
        include: { plan: { select: { name: true } } },
        orderBy: { expiresAt: 'asc' },
      }),
    ]);

    for (const order of pendingStudentOrders) {
      notifications.push({
        id: `pending-${order.id}`,
        type: 'PAYMENT_STATUS',
        title: 'Pago en revisión',
        body: `Tu pago de ${order.plan?.name ?? 'plan'} está siendo revisado`,
        createdAt: order.createdAt.toISOString(),
      });
    }

    for (const order of rejectedOrders) {
      notifications.push({
        id: `rejected-${order.id}`,
        type: 'PAYMENT_STATUS',
        title: 'Pago rechazado',
        body: `Tu pago de ${order.plan?.name ?? 'plan'} fue rechazado. Sube un nuevo comprobante.`,
        createdAt: order.createdAt.toISOString(),
      });
    }

    if (expiringOrder) {
      const daysLeft = Math.ceil(
        (expiringOrder.expiresAt!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      notifications.push({
        id: `expiring-${expiringOrder.id}`,
        type: 'EXPIRING_MEMBERSHIP',
        title: 'Tu membresía vence pronto',
        body: `${expiringOrder.plan?.name ?? 'Tu plan'} vence en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}`,
        createdAt: expiringOrder.expiresAt!.toISOString(),
      });
    }
  }

  // Sort: most recent first
  notifications.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return c.json({ notifications });
});

export default notificationsRoutes;
