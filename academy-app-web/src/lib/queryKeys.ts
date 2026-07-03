/**
 * Fuente única de query keys de TanStack Query. Evita strings mágicos sueltos
 * y hace las invalidaciones consistentes. Las keys parametrizadas son funciones;
 * las fijas son tuplas `as const`.
 *
 * Nota de convención: cada dashboard de rol tiene su PROPIA key
 * `['dashboard', variant]` (variant = 'admin'|'teacher'|'student') — NO comparten
 * key porque cada uno pega a un endpoint distinto (compartirla haría que un
 * refetch por prefijo use la queryFn equivocada → 403). Se invalidan todos por
 * prefijo con `qk.dashboardAll` = `['dashboard']`.
 */
export const qk = {
  me: ['me'] as const,
  dashboard: (variant: 'admin' | 'teacher' | 'student') =>
    ['dashboard', variant] as const,
  dashboardAll: ['dashboard'] as const,

  plans: ['plans'] as const,
  activePlans: ['plans-options'] as const,
  students: ['students'] as const,
  teachers: ['teachers'] as const,
  assignableTeachers: ['assignable-teachers'] as const,
  classes: ['classes'] as const,
  payments: ['payments'] as const,
  notifications: ['notifications'] as const,
  myEnrollments: ['my-enrollments'] as const,
  reports: ['reports'] as const,

  subscriptions: (period: string) => ['subscriptions', period] as const,
  payouts: (period: string) => ['payouts', period] as const,
  monthlyAttendance: (period: string, classId: string) =>
    ['monthly-attendance', period, classId] as const,
  monthlyAttendanceAll: (period: string) => ['monthly-attendance-all', period] as const,
  sessionAttendance: (classId: string, date: string) =>
    ['session-attendance', classId, date] as const,
  studentHistory: (id: string) => ['student-history', id] as const,
} as const;
