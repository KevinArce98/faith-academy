import type { AuthContext } from '../types/auth.js';
import { db } from './db.js';
import type { Role } from './roles.js';
import { hashPassword } from './utils/hash.js';

type RoleInput = Role | Role[];

export async function createUserProfile({
	email,
	name,
	role = 'STUDENT',
	avatarUrl = null,
	passwordHash,
}: {
	email: string;
	name?: string | null;
	role?: Role;
	avatarUrl?: string | null;
	passwordHash: string;
}) {
	return db.userProfile.create({
		data: {
			email,
			name,
			role,
			avatarUrl,
			passwordHash,
		},
	});
}

export async function createManagedUser({
	email,
	name,
	role,
	tempPassword,
	phone,
}: {
	email: string;
	name?: string | null;
	role: Role;
	tempPassword: string;
	phone?: string | null;
}) {
	const passwordHash = await hashPassword(tempPassword);
	return db.userProfile.create({
		data: {
			email,
			name,
			role,
			passwordHash,
			emailVerified: true,
			phone: phone ?? null,
		},
	});
}

export async function getCurrentUser(c: AuthContext) {
	const auth = c.get('auth');
	if (!auth?.userId) return null;

	const user = await db.userProfile.findUnique({
		where: { id: auth.userId },
	});

	if (!user || !user.isActive) return null;

	return user;
}

export async function requireRole(c: AuthContext, role: RoleInput) {
	const user = await getCurrentUser(c);
	if (!user) throw new Error('UNAUTHENTICATED');

	const roles = Array.isArray(role) ? role : [role];
	if (!roles.includes(user.role as Role)) throw new Error('UNAUTHORIZED');

	return user;
}

export function unauthorized() {
	return { error: 'UNAUTHORIZED' };
}
