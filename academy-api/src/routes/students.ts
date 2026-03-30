import { createClerkClient } from '@clerk/backend';
import { Hono } from 'hono';
import { createStudentSchema, updateStudentSchema } from '@academy/shared/validations/students';
import { authMiddleware } from '../middleware/auth.js';
import { getCurrentUser, requireRole } from '../lib/auth.js';
import { db } from '../lib/db.js';
import type { AuthVariables } from '../types/auth.js';

const studentsRoutes = new Hono<{ Variables: AuthVariables }>();

function getClerkClient() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error('CLERK_SECRET_KEY is required');
  }

  return createClerkClient({ secretKey });
}

function generateTempPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const numbers = '23456789';
  const special = '@#$%&*';
  const all = upper + lower + numbers + special;

  const required = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    numbers[Math.floor(Math.random() * numbers.length)],
    special[Math.floor(Math.random() * special.length)],
  ];

  const rest = Array.from({ length: 8 }, () => all[Math.floor(Math.random() * all.length)]);

  return [...required, ...rest].sort(() => Math.random() - 0.5).join('');
}

studentsRoutes.get('/', authMiddleware, async (c) => {
  try {
    await requireRole(c, ['ADMIN', 'TEACHER']);
  } catch (error) {
    const status = error instanceof Error && error.message === 'UNAUTHENTICATED' ? 401 : 403;
    return c.json({ error: 'No autorizado' }, status);
  }

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
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return c.json({ students });
});

studentsRoutes.post('/', authMiddleware, async (c) => {
  try {
    await requireRole(c, ['ADMIN', 'TEACHER']);
  } catch (error) {
    const status = error instanceof Error && error.message === 'UNAUTHENTICATED' ? 401 : 403;
    return c.json({ success: false, error: 'No autorizado' }, status);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = createStudentSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.flatten() }, 422);
  }

  const { name, email, notes, phone } = parsed.data;
  const planId = parsed.data.planId?.trim() || null;

  try {
    const clerk = getClerkClient();

    const parts = name.trim().split(/\s+/).filter(Boolean);
    const firstName = parts[0] ?? name;
    const lastName = parts.length > 1 ? parts.slice(1).join(' ') : undefined;
    const tempPassword = generateTempPassword();

    const clerkUser = await clerk.users.createUser({
      emailAddress: [email],
      firstName,
      lastName,
      password: tempPassword,
      publicMetadata: { role: 'STUDENT' },
    });

    try {
      const created = await db.userProfile.create({
        data: {
          clerkId: clerkUser.id,
          email,
          name,
          phone: phone?.trim() ? phone.trim() : null,
          role: 'STUDENT',
        },
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
    } catch (dbErr) {
      try {
        await clerk.users.deleteUser(clerkUser.id);
      } catch {
        // noop
      }
      throw dbErr;
    }
  } catch (err) {
    let message = 'Error al crear el alumno.';
    if (typeof err === 'object' && err !== null && 'errors' in err) {
      const clerkError = err as { errors?: Array<{ longMessage?: string; message?: string }> };
      message = clerkError.errors?.[0]?.longMessage ?? clerkError.errors?.[0]?.message ?? message;
    }

    return c.json({ success: false, error: message }, 400);
  }
});

studentsRoutes.put('/:id', authMiddleware, async (c) => {
  try {
    await requireRole(c, ['ADMIN', 'TEACHER']);
  } catch (error) {
    const status = error instanceof Error && error.message === 'UNAUTHENTICATED' ? 401 : 403;
    return c.json({ success: false, error: 'No autorizado' }, status);
  }

  const body = await c.req.json().catch(() => null);
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

  const hasProfileChanges = name !== currentName || email !== currentEmail || phone !== currentPhone;
  const hasMembershipChanges =
    (planId && latestOrder?.planId !== planId) ||
    (latestOrder && (latestOrder.notes ?? null) !== notes);

  if (!hasProfileChanges && !hasMembershipChanges) {
    return c.json({ success: false, error: 'No hay cambios para aplicar.' }, 400);
  }

  let updated = student;
  if (hasProfileChanges) {
    updated = await db.userProfile.update({
      where: { id: student.id },
      data: { name, email, phone },
      include: { orders: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    const parts = name.split(' ');
    const firstName = parts[0] ?? name;
    const lastName = parts.length > 1 ? parts.slice(1).join(' ') : undefined;

    try {
      const clerk = getClerkClient();
      await clerk.users.updateUser(student.clerkId, { firstName, lastName });
    } catch {
      // noop - BD is source of truth
    }
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
  }

  return c.json({ success: true, student: updated, email });
});

studentsRoutes.delete('/:id', authMiddleware, async (c) => {
  try {
    await requireRole(c, ['ADMIN', 'TEACHER']);
  } catch (error) {
    const status = error instanceof Error && error.message === 'UNAUTHENTICATED' ? 401 : 403;
    return c.json({ success: false, error: 'No autorizado' }, status);
  }

  const id = c.req.param('id');
  const student = await db.userProfile.findFirst({
    where: { id, role: 'STUDENT' },
    select: { id: true, clerkId: true, name: true },
  });

  if (!student) {
    return c.json({ success: false, error: 'Alumno no encontrado.' }, 404);
  }

  try {
    const clerk = getClerkClient();
    await clerk.users.deleteUser(student.clerkId);
  } catch {
    // noop - continue cleanup in DB
  }

  const orders = await db.membershipOrder.findMany({
    where: { studentId: student.id },
    select: { id: true },
  });

  const orderIds = orders.map((order: { id: string }) => order.id);

  await db.creditLedger.deleteMany({
    where: {
      OR: [{ studentId: student.id }, ...(orderIds.length > 0 ? [{ orderId: { in: orderIds } }] : [])],
    },
  });

  await Promise.all([
    db.classWaitlist.deleteMany({ where: { studentId: student.id } }),
    db.attendance.deleteMany({ where: { studentId: student.id } }),
    db.userSkill.deleteMany({ where: { studentId: student.id } }),
    db.streak.deleteMany({ where: { studentId: student.id } }),
    db.familyMember.deleteMany({ where: { studentId: student.id } }),
    db.membershipOrder.deleteMany({ where: { studentId: student.id } }),
  ]);

  await db.userProfile.delete({ where: { id: student.id } });

  return c.json({ success: true });
});

export default studentsRoutes;
