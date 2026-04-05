import type { Role } from './roles.js';
import type { AuthContext } from '../types/auth.js';
import { getClerkClient } from './clerk.js';
import { db } from './db.js';

type RoleInput = Role | Role[];

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

export async function getCurrentUser(c: AuthContext) {
  const auth = c.get('auth');
  if (!auth?.userId) return null;

  let user = await db.userProfile.findUnique({
    where: { clerkId: auth.userId },
  });

  if (!user) {
    try {
      const clerk = getClerkClient();
      const clerkUser = await clerk.users.getUser(auth.userId);
      user = await createUserProfile({
        clerkId: auth.userId,
        email: clerkUser.emailAddresses[0]?.emailAddress ?? '',
        name: `${clerkUser.firstName ?? ''} ${clerkUser.lastName ?? ''}`.trim(),
        avatarUrl: clerkUser.imageUrl ?? null,
        role: 'STUDENT',
      });
    } catch {
      return null;
    }
  }

  if (!user.isActive) return null;

  return user;
}

export async function requireRole(c: AuthContext, role: RoleInput) {
  const user = await getCurrentUser(c);
  if (!user) {
    throw new Error('UNAUTHENTICATED');
  }

  const roles = Array.isArray(role) ? role : [role];
  if (!roles.includes(user.role as Role)) {
    throw new Error('UNAUTHORIZED');
  }

  return user;
}

export function unauthorized() {
  return { error: 'UNAUTHORIZED' };
}
