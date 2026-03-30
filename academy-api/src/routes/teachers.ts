import { createClerkClient } from '@clerk/backend';
import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole, createUserProfile } from '../lib/auth.js';
import { getTeachersWithClasses } from '../lib/teachers.js';
import { db } from '../lib/db.js';
import type { AuthVariables } from '../types/auth.js';
import type { Role } from '@academy/shared/lib/roles';

const teachersRoutes = new Hono<{ Variables: AuthVariables }>();

function getClerkClient() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new Error('CLERK_SECRET_KEY is required');
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

const createTeacherSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.email('Email inválido'),
});

const updateTeacherSchema = z.object({
  isActive: z.boolean().optional(),
  role: z.enum(['ADMIN', 'TEACHER', 'STUDENT']).optional(),
  name: z.string().optional(),
});

// GET /teachers
teachersRoutes.get('/', authMiddleware, async (c) => {
  try {
    await requireRole(c, 'ADMIN');
  } catch (error) {
    const status = error instanceof Error && error.message === 'UNAUTHENTICATED' ? 401 : 403;
    return c.json({ error: 'No autorizado' }, status);
  }

  const teachers = await getTeachersWithClasses();
  return c.json(teachers);
});

// POST /teachers — create a new teacher
teachersRoutes.post('/', authMiddleware, async (c) => {
  try {
    await requireRole(c, 'ADMIN');
  } catch (error) {
    const status = error instanceof Error && error.message === 'UNAUTHENTICATED' ? 401 : 403;
    return c.json({ error: 'No autorizado' }, status);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = createTeacherSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 422);
  }

  const { name, email } = parsed.data;
  const clerk = getClerkClient();
  const tempPassword = generateTempPassword();

  try {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const firstName = parts[0] ?? name;
    const lastName = parts.length > 1 ? parts.slice(1).join(' ') : undefined;

    const clerkUser = await clerk.users.createUser({
      emailAddress: [email],
      firstName,
      lastName,
      password: tempPassword,
      publicMetadata: { role: 'TEACHER' },
    });

    const userProfile = await createUserProfile({
      clerkId: clerkUser.id,
      email,
      name,
      role: 'TEACHER',
    });

    return c.json({ success: true, userId: userProfile.id, tempPassword }, 201);
  } catch (err) {
    let message = 'Error al crear el profesor.';
    if (typeof err === 'object' && err !== null && 'errors' in err) {
      const clerkError = err as { errors?: Array<{ longMessage?: string; message?: string }> };
      message = clerkError.errors?.[0]?.longMessage ?? clerkError.errors?.[0]?.message ?? message;
    }
    return c.json({ error: message }, 400);
  }
});

// PATCH /teachers/:id — update teacher (isActive, role, name)
teachersRoutes.patch('/:id', authMiddleware, async (c) => {
  try {
    await requireRole(c, 'ADMIN');
  } catch (error) {
    const status = error instanceof Error && error.message === 'UNAUTHENTICATED' ? 401 : 403;
    return c.json({ error: 'No autorizado' }, status);
  }

  const id = c.req.param('id');
  const body = await c.req.json().catch(() => null);
  const parsed = updateTeacherSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 422);
  }

  const { isActive, role, name } = parsed.data;

  const teacher = await db.userProfile.findUnique({ where: { id } });
  if (!teacher) {
    return c.json({ error: 'Profesor no encontrado.' }, 404);
  }

  if (isActive === false) {
    const activeClasses = await db.class.count({
      where: { teacherId: teacher.id, isActive: true },
    });
    if (activeClasses > 0) {
      return c.json(
        {
          error: `No se puede desactivar. El profesor tiene ${activeClasses} clase(s) activa(s). Reasigna las clases primero.`,
        },
        400,
      );
    }
  }

  const data: { isActive?: boolean; role?: Role; name?: string } = {};
  if (typeof isActive === 'boolean') data.isActive = isActive;
  if (role) data.role = role as Role;

  let normalizedName: string | undefined;
  if (typeof name === 'string') {
    const trimmed = name.replace(/\s+/g, ' ').trim();
    if (trimmed && trimmed !== teacher.name) {
      normalizedName = trimmed;
      data.name = trimmed;
    }
  }

  if (!Object.keys(data).length) {
    return c.json({ error: 'No hay cambios para aplicar.' }, 400);
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
    try {
      const clerk = getClerkClient();
      await clerk.users.updateUser(teacher.clerkId, clerkPayload);
    } catch {
      // noop - DB is source of truth
    }
  }

  return c.json(updated);
});

// DELETE /teachers/:id
teachersRoutes.delete('/:id', authMiddleware, async (c) => {
  try {
    await requireRole(c, 'ADMIN');
  } catch (error) {
    const status = error instanceof Error && error.message === 'UNAUTHENTICATED' ? 401 : 403;
    return c.json({ error: 'No autorizado' }, status);
  }

  const id = c.req.param('id');
  const teacher = await db.userProfile.findUnique({ where: { id } });
  if (!teacher) {
    return c.json({ error: 'Profesor no encontrado.' }, 404);
  }

  const activeClasses = await db.class.count({
    where: { teacherId: teacher.id, isActive: true },
  });
  if (activeClasses > 0) {
    return c.json(
      { error: `No se puede eliminar. Tiene ${activeClasses} clase(s) activa(s).` },
      400,
    );
  }

  try {
    const clerk = getClerkClient();
    await clerk.users.deleteUser(teacher.clerkId);
  } catch {
    // noop
  }

  await db.userProfile.delete({ where: { id } });
  return c.json({ success: true });
});

export default teachersRoutes;
