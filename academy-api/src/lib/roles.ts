export type Role = 'ADMIN' | 'TEACHER' | 'STUDENT';

export function isAdmin(role: Role): boolean {
	return role === 'ADMIN';
}

export function isAdminOrTeacher(role: Role): boolean {
	return role === 'ADMIN' || role === 'TEACHER';
}

export function isStudent(role: Role): boolean {
	return role === 'STUDENT';
}
