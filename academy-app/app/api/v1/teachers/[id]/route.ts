import { revalidatePath } from 'next/cache';
import { createClerkClient } from '@clerk/nextjs/server';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import type { Role } from '@/lib/roles';

function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole('ADMIN');
  const { id } = await params;
  const {
    isActive,
    role,
    name,
  }: {
    isActive?: boolean;
    role?: Role;
    name?: string;
  } = await req.json();

  const teacher = await db.userProfile.findUnique({ where: { id } });
  if (!teacher) {
    return jsonError('Profesor no encontrado.', 404);
  }

  if (isActive === false) {
    const clasesActivas = await db.class.count({
      where: { teacherId: teacher.id, isActive: true },
    });
    if (clasesActivas > 0) {
      return jsonError(
        `No se puede desactivar. El profesor tiene ${clasesActivas} clase(s) activa(s). Reasigna las clases primero.`,
        400
      );
    }
  }

  const data: {
    isActive?: boolean;
    role?: Role;
    name?: string;
  } = {};
  if (typeof isActive === 'boolean') data.isActive = isActive;
  if (role) data.role = role;
  let normalizedName: string | undefined;
  if (typeof name === 'string') {
    const trimmed = name.replace(/\s+/g, ' ').trim();
    if (trimmed && trimmed !== teacher.name) {
      normalizedName = trimmed;
      data.name = trimmed;
    }
  }

  if (!Object.keys(data).length) {
    return jsonError('No hay cambios para aplicar.');
  }

  const updated = await db.userProfile.update({ where: { id }, data });

  const clerkPayload: Record<string, unknown> = {};
  if (role && role !== teacher.role) {
    clerkPayload.publicMetadata = { role };
  }
  if (normalizedName) {
    const parts = normalizedName.split(' ');
    clerkPayload.firstName = parts[0] ?? normalizedName;
    clerkPayload.lastName = parts.slice(1).join(' ') || undefined;
  }

  if (Object.keys(clerkPayload).length) {
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY!,
    });
    await clerk.users.updateUser(teacher.clerkId, clerkPayload);
  }

  revalidatePath('/teachers');
  revalidatePath('/classes');
  if (role === 'STUDENT') {
    revalidatePath('/students');
  }

  return Response.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole('ADMIN');
  const { id } = await params;

  const teacher = await db.userProfile.findUnique({ where: { id } });
  if (!teacher) {
    return jsonError('Profesor no encontrado.', 404);
  }

  const clasesActivas = await db.class.count({
    where: { teacherId: teacher.id, isActive: true },
  });
  if (clasesActivas > 0) {
    return jsonError(
      `No se puede eliminar. Tiene ${clasesActivas} clase(s) activa(s).`,
      400
    );
  }

  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
  await clerk.users.deleteUser(teacher.clerkId);
  await db.userProfile.delete({ where: { id } });

  revalidatePath('/teachers');
  revalidatePath('/classes');

  return Response.json({ success: true });
}
