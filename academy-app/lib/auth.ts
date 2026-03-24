import { auth, clerkClient } from '@clerk/nextjs/server';
import type { Role } from '@/lib/roles';
import { db } from './db';

export async function getCurrentUser() {
  const { userId } = await auth();
  if (!userId) return null;

  // El perfil siempre se lee desde la BD, nunca desde Clerk publicMetadata
  let user = await db.userProfile.findUnique({
    where: { clerkId: userId },
  });

  // Safety net: si el usuario existe en Clerk pero no en la BD
  // (edge case: cerro el navegador justo despues de verificar el email)
  if (!user) {
    try {
      const client = await clerkClient();
      const clerkUser = await client.users.getUser(userId);
      user = await createUserProfile({
        clerkId:   userId,
        email:     clerkUser.emailAddresses[0]?.emailAddress ?? '',
        name:      `${clerkUser.firstName ?? ''} ${clerkUser.lastName ?? ''}`.trim(),
        avatarUrl: clerkUser.imageUrl ?? null,
        role:      'STUDENT',
      });
    } catch {
      return null;
    }
  }

  if (!user.isActive) return null;

  return user;
}

export async function createUserProfile({
  clerkId,
  email,
  name,
  role = 'STUDENT',
  avatarUrl = null,
}: {
  clerkId: string;
  email: string;
  name?: string | null;
  role?: Role;
  avatarUrl?: string | null;
}) {
  return db.userProfile.create({
    data: {
      clerkId,
      email,
      name,
      role,
      avatarUrl,
    },
  });
}

// Verificar rol y retornar el usuario
export async function requireRole(
  role: 'ADMIN' | 'TEACHER' | 'STUDENT' | ('ADMIN' | 'TEACHER' | 'STUDENT')[]
) {
  const user = await getCurrentUser();
  if (!user) throw new Error('UNAUTHENTICATED');

  const roles = Array.isArray(role) ? role : [role];
  if (!roles.includes(user.role)) throw new Error('UNAUTHORIZED');

  return user;
}

// Helper para respuestas de error estandarizadas en Route Handlers
export function unauthorized() {
  return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 });
}
