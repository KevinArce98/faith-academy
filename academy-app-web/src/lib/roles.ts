export type Role = 'ADMIN' | 'TEACHER' | 'STUDENT';

// ─── Route permissions per role ─────────────────────────────────────────────

export const ROLE_ROUTE_ACCESS: Record<Role, string[]> = {
  ADMIN: [
    '/',
    '/students',
    '/teachers',
    '/payments',
    '/classes',
    '/attendance',
    '/class-attendance',
    '/payouts',
    '/plans',
    '/video-library',
    '/reports',
    '/account',
  ],
  TEACHER: ['/', '/classes', '/class-attendance', '/video-library', '/account'],
  STUDENT: [
    '/',
    '/classes',
    '/my-classes',
    '/plans',
    '/payments',
    '/video-library',
    '/account',
  ],
};

// ─── Helpers ────────────────────────────────────────────────────────────────

export function canAccessRoute(role: Role, pathname: string): boolean {
  const allowed = ROLE_ROUTE_ACCESS[role] ?? [];
  if (pathname === '/') return allowed.includes('/');
  return allowed.some((route) => route !== '/' && pathname.startsWith(route));
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
