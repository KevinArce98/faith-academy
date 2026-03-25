import { revalidatePath } from 'next/cache';
import { clerkClient } from '@clerk/nextjs/server';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { updateStudentSchema } from '@/lib/validations/students';

function jsonError(message: string, status = 400) {
  return Response.json({ success: false, error: message }, { status });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(['ADMIN', 'TEACHER']);
  } catch {
    return jsonError('No autorizado', 403);
  }

  const body = await req.json();
  const parsed = updateStudentSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { success: false, error: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const { id } = await params;
  const student = await db.userProfile.findFirst({
    where: { id, role: 'STUDENT' },
    include: {
      orders: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });
  if (!student) {
    return jsonError('Alumno no encontrado.', 404);
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
    return jsonError('No hay cambios para aplicar.');
  }

  let updated = student;
  if (hasProfileChanges) {
    updated = await db.userProfile.update({
      where: { id: student.id },
      data: { name, email, phone },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  const parts = name.split(' ');
  const firstName = parts[0] ?? name;
  const lastName = parts.length > 1 ? parts.slice(1).join(' ') : undefined;

  const client = await clerkClient();
  await client.users.updateUser(student.clerkId, {
    firstName,
    lastName,
  });

  if (email !== currentEmail) {
    await client.users.updateUser(student.clerkId, {
      primaryEmailAddressID: email,
    });
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

  revalidatePath('/students');
  return Response.json({ success: true, student: updated, email });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(['ADMIN', 'TEACHER']);
  } catch {
    return jsonError('No autorizado', 403);
  }

  const { id } = await params;
  const student = await db.userProfile.findFirst({
    where: { id, role: 'STUDENT' },
    select: { id: true, clerkId: true, name: true },
  });

  if (!student) {
    return jsonError('Alumno no encontrado.', 404);
  }

  const client = await clerkClient();
  await client.users.deleteUser(student.clerkId);

  await db.$transaction(async (tx) => {
    const orders = await tx.membershipOrder.findMany({
      where: { studentId: student.id },
      select: { id: true },
    });
    const orderIds = orders.map((order) => order.id);

    await tx.creditLedger.deleteMany({
      where: {
        OR: [
          { studentId: student.id },
          ...(orderIds.length > 0 ? [{ orderId: { in: orderIds } }] : []),
        ],
      },
    });

    await Promise.all([
      tx.classWaitlist.deleteMany({ where: { studentId: student.id } }),
      tx.attendance.deleteMany({ where: { studentId: student.id } }),
      tx.userSkill.deleteMany({ where: { studentId: student.id } }),
      tx.streak.deleteMany({ where: { studentId: student.id } }),
      tx.familyMember.deleteMany({ where: { studentId: student.id } }),
      tx.membershipOrder.deleteMany({ where: { studentId: student.id } }),
    ]);

    await tx.userProfile.delete({ where: { id: student.id } });
  });

  revalidatePath('/students');
  return Response.json({ success: true });
}
