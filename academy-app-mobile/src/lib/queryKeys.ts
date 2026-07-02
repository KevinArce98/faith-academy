/**
 * Fuente única de query keys de TanStack Query. Evita strings mágicos sueltos
 * y hace las invalidaciones consistentes. Las keys parametrizadas son funciones;
 * las fijas son tuplas `as const`.
 *
 * Nota de convención: `dashboard(role)` produce `['dashboard', role]`, pero se
 * invalida por prefijo con `qk.dashboard()` → `['dashboard']` (match por prefijo
 * de TanStack Query).
 */
export const qk = {
  me: ['me'] as const,
  dashboard: (role?: string) => ['dashboard', role ?? ''] as const,

  plans: ['plans'] as const,
  students: ['students'] as const,
  teachers: ['teachers'] as const,
  assignableTeachers: ['assignable-teachers'] as const,
  classes: ['classes'] as const,
  payments: ['payments'] as const,
  notifications: ['notifications'] as const,
  myEnrollments: ['my-enrollments'] as const,

  subscriptions: (period: string) => ['subscriptions', period] as const,
  payouts: (period: string) => ['payouts', period] as const,
  monthlyAttendance: (period: string, classId: string) =>
    ['monthly-attendance', period, classId] as const,
  sessionAttendance: (classId: string, date: string) =>
    ['session-attendance', classId, date] as const,
  studentHistory: (id: string) => ['student-history', id] as const,
} as const;

/** Raíz de una key (para predicados de refetch por prefijo en usePullRefresh). */
export const qkRoot = {
  me: 'me',
  dashboard: 'dashboard',
  plans: 'plans',
  students: 'students',
  teachers: 'teachers',
  assignableTeachers: 'assignable-teachers',
  classes: 'classes',
  payments: 'payments',
  notifications: 'notifications',
  myEnrollments: 'my-enrollments',
  subscriptions: 'subscriptions',
  payouts: 'payouts',
  monthlyAttendance: 'monthly-attendance',
  sessionAttendance: 'session-attendance',
  studentHistory: 'student-history',
} as const;
