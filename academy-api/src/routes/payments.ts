import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Hono } from 'hono';
import { createOrderSchema, rejectOrderSchema, uploadUrlSchema } from '../lib/validations/payments.js';
import { addDays, addMonths, addYears } from '../lib/utils/date.js';
import { authMiddleware } from '../middleware/auth.js';
import { getCurrentUser, requireRole } from '../lib/auth.js';
import { db } from '../lib/db.js';
import type { AuthVariables } from '../types/auth.js';

const paymentsRoutes = new Hono<{ Variables: AuthVariables }>();

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ?? '',
  },
});

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
      include: { plan: true },
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
      },
      orderBy: { createdAt: 'desc' },
    });

    return c.json({ orders });
  }

  return c.json({ error: 'No autorizado' }, 403);
});

paymentsRoutes.post('/orders', authMiddleware, async (c) => {
  let user;
  try {
    user = await requireRole(c, 'STUDENT');
  } catch (error) {
    const status = error instanceof Error && error.message === 'UNAUTHENTICATED' ? 401 : 403;
    return c.json({ error: 'No autorizado' }, status);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 422);
  }

  const { planId, receiptKey } = parsed.data;
  const plan = await db.membershipPlan.findFirst({
    where: { id: planId, isActive: true },
  });

  if (!plan) {
    return c.json({ error: 'Plan no encontrado' }, 404);
  }

  const receiptBase = process.env.CLOUDFLARE_R2_PUBLIC_URL;
  if (!receiptBase) {
    return c.json({ error: 'CLOUDFLARE_R2_PUBLIC_URL no configurado' }, 500);
  }

  const receiptUrl = `${receiptBase}/${receiptKey}`;

  const order = await db.membershipOrder.create({
    data: {
      studentId: user.id,
      planId,
      receiptUrl,
      status: 'PENDING_REVIEW',
    },
  });

  return c.json(order, 201);
});

paymentsRoutes.post('/orders/:id/approve', authMiddleware, async (c) => {
  let admin;
  try {
    admin = await requireRole(c, 'ADMIN');
  } catch (error) {
    const status = error instanceof Error && error.message === 'UNAUTHENTICATED' ? 401 : 403;
    return c.json({ error: 'No autorizado' }, status);
  }

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
  const { intervalType, intervalValue, credits } = order.plan;

  let expiresAt: Date;
  if (intervalType === 'MONTHLY') {
    expiresAt = addMonths(now, intervalValue);
  } else if (intervalType === 'WEEKLY') {
    expiresAt = addDays(now, intervalValue * 7);
  } else {
    expiresAt = addYears(now, 1);
  }

  const lastEntry = await db.creditLedger.findFirst({
    where: { studentId: order.studentId },
    orderBy: { createdAt: 'desc' },
  });
  const currentBalance = lastEntry?.balance ?? 0;

  const [updatedOrder] = await db.$transaction([
    db.membershipOrder.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        startsAt: now,
        expiresAt,
        creditGranted: credits,
        approvedById: admin.clerkId,
        approvedAt: now,
      },
    }),
    db.creditLedger.create({
      data: {
        studentId: order.studentId,
        orderId: order.id,
        type: 'CREDIT_GRANT',
        amount: credits,
        balance: currentBalance + credits,
        note: `Plan aprobado: ${order.plan.name}`,
      },
    }),
  ]);

  return c.json(updatedOrder);
});

paymentsRoutes.post('/orders/:id/reject', authMiddleware, async (c) => {
  try {
    await requireRole(c, 'ADMIN');
  } catch (error) {
    const status = error instanceof Error && error.message === 'UNAUTHENTICATED' ? 401 : 403;
    return c.json({ error: 'No autorizado' }, status);
  }

  const id = c.req.param('id');

  const body = await c.req.json().catch(() => null);
  const parsed = rejectOrderSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 422);
  }

  const order = await db.membershipOrder.findUnique({ where: { id } });
  if (!order) {
    return c.json({ error: 'Orden no encontrada' }, 404);
  }

  if (order.status !== 'PENDING_REVIEW') {
    return c.json({ error: 'La orden no está en estado PENDING_REVIEW' }, 409);
  }

  const updated = await db.membershipOrder.update({
    where: { id },
    data: {
      status: 'REJECTED',
      notes: parsed.data.notes,
    },
  });

  return c.json(updated);
});

paymentsRoutes.post('/upload-url', authMiddleware, async (c) => {
  const user = await getCurrentUser(c);
  if (!user) {
    return c.json({ error: 'No autenticado' }, 401);
  }

  const body = await c.req.json().catch(() => null);
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

  const uploadUrl = await getSignedUrl(r2, command, { expiresIn: EXPIRES_IN });
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
    return c.json({ error: 'El archivo excede el tamaño máximo de 10 MB' }, 413);
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!ALLOWED_EXTS.has(ext)) {
    return c.json({ error: 'Tipo de archivo no permitido. Usa JPG, PNG, WEBP o PDF' }, 422);
  }

  const key = `receipts/${user.id}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await r2.send(
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
