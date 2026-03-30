export type Role = 'ADMIN' | 'TEACHER' | 'STUDENT';

export const ROLE_ROUTE_ACCESS: Record<Role, string[]> = {
  ADMIN: [
    '/',
    '/students',
    '/teachers',
    '/payments',
    '/classes',
    '/plans',
    '/video-library',
    '/reports',
    '/settings',
  ],
  TEACHER: [
    '/',
    '/students',
    '/payments',
    '/classes',
    '/plans',
    '/video-library',
  ],
  STUDENT: ['/', '/classes', '/plans', '/payments', '/video-library'],
};

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
