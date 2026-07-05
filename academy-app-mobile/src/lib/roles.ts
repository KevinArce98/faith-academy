export type Role = 'ADMIN' | 'TEACHER' | 'STUDENT';

export const ROLE_SCREEN_ACCESS: Record<Role, string[]> = {
  ADMIN: [
    '/',
    '/students',
    '/teachers',
    '/payments',
    '/classes',
    '/class-attendance',
    '/payouts',
    '/plans',
    '/monthly-attendance',
    '/notifications',
    '/student-history',
    '/more',
    '/account',
  ],
  TEACHER: ['/', '/classes', '/class-attendance', '/notifications', '/more', '/account'],
  STUDENT: [
    '/',
    '/my-classes',
    '/plans',
    '/payments',
    '/notifications',
    '/more',
    '/account',
  ],
};

export function canAccess(role: Role, screen: string): boolean {
  return ROLE_SCREEN_ACCESS[role]?.includes(screen) ?? false;
}

export function isAdmin(role: Role): boolean {
  return role === 'ADMIN';
}

export function isAdminOrTeacher(role: Role): boolean {
  return role === 'ADMIN' || role === 'TEACHER';
}

export function isStudent(role: Role): boolean {
  return role === 'STUDENT';
}
