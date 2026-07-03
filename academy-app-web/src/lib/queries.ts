import { useQuery } from '@tanstack/react-query';

import type { Cls } from '@/components/dashboard/classes/classes.types';
import type { Order } from '@/components/dashboard/payments/payments.types';
import { useApiClient } from '@/lib/api';
import type { MeResponse } from '@/lib/interfaces/auth';
import type {
  AdminDashboardData,
  StudentDashboardData,
  TeacherDashboardData,
} from '@/lib/interfaces/dashboard';
import type { EnrollData } from '@/lib/interfaces/enrollment';
import type { PayoutsResponse } from '@/lib/interfaces/payouts';
import type { Plan } from '@/lib/interfaces/plans';
import type { Student } from '@/lib/interfaces/students';
import type { TeacherProfile } from '@/lib/interfaces/teachers';
import { qk } from '@/lib/queryKeys';
import type { Role } from '@/lib/roles';

// Capa de dominio: un hook por recurso. Encapsula endpoint, query key y
// staleTime para que las páginas no repitan URLs ni keys sueltas.
// (Mismo patrón que academy-app-mobile/src/lib/queries.ts.)

const ME_STALE = 5 * 60 * 1000;

export type AssignableTeacher = { id: string; name: string | null; role: string };

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read: boolean;
  createdAt: string;
};

/** Usuario autenticado + rol. Fuente única. */
export function useMe(enabled = true) {
  const api = useApiClient();
  return useQuery<MeResponse>({
    queryKey: qk.me,
    queryFn: () => api<MeResponse>('/api/v1/auth/me'),
    staleTime: ME_STALE,
    enabled,
  });
}

/** Rol del usuario (undefined mientras carga). */
export function useRole(): Role | undefined {
  return useMe().data?.role;
}

export function usePlans(enabled = true) {
  const api = useApiClient();
  return useQuery<Plan[]>({
    queryKey: qk.plans,
    queryFn: async () => {
      const res = await api<{ plans: Plan[] }>('/api/v1/plans');
      return res.plans;
    },
    enabled,
  });
}

/** Solo planes activos (para selects de pago). */
export function useActivePlans(enabled = true) {
  const api = useApiClient();
  return useQuery<Plan[]>({
    queryKey: qk.activePlans,
    queryFn: async () => {
      const res = await api<{ plans: Plan[] }>('/api/v1/plans?activeOnly=true');
      return res.plans;
    },
    enabled,
  });
}

export function useStudents() {
  const api = useApiClient();
  return useQuery<Student[]>({
    queryKey: qk.students,
    queryFn: async () => {
      const res = await api<{ students: Student[] }>('/api/v1/students');
      return res.students;
    },
  });
}

export function useTeachers(enabled = true) {
  const api = useApiClient();
  return useQuery<TeacherProfile[]>({
    queryKey: qk.teachers,
    queryFn: () => api<TeacherProfile[]>('/api/v1/teachers'),
    enabled,
  });
}

export function useAssignableTeachers() {
  const api = useApiClient();
  return useQuery<AssignableTeacher[]>({
    queryKey: qk.assignableTeachers,
    queryFn: async () => {
      const res = await api<{ teachers: AssignableTeacher[] }>('/api/v1/teachers/assignable');
      return res.teachers;
    },
    staleTime: ME_STALE,
  });
}

export function useClasses() {
  const api = useApiClient();
  return useQuery<Cls[]>({
    queryKey: qk.classes,
    queryFn: async () => {
      const res = await api<{ classes: Cls[] }>('/api/v1/classes');
      return res.classes;
    },
  });
}

export function usePaymentOrders(enabled = true) {
  const api = useApiClient();
  return useQuery<Order[]>({
    queryKey: qk.payments,
    queryFn: async () => {
      const res = await api<{ orders: Order[] }>('/api/v1/payments/orders');
      return res.orders;
    },
    enabled,
  });
}

export function useNotifications(enabled = true) {
  const api = useApiClient();
  return useQuery<{ notifications: NotificationItem[]; unreadCount: number }>({
    queryKey: qk.notifications,
    queryFn: () =>
      api<{ notifications: NotificationItem[]; unreadCount: number }>('/api/v1/notifications'),
    enabled,
  });
}

export function useMyEnrollments() {
  const api = useApiClient();
  return useQuery<EnrollData>({
    queryKey: qk.myEnrollments,
    queryFn: () => api<EnrollData>('/api/v1/monthly-attendance/me'),
  });
}

export function usePayouts(period: string) {
  const api = useApiClient();
  return useQuery<PayoutsResponse>({
    queryKey: qk.payouts(period),
    queryFn: () => api<PayoutsResponse>(`/api/v1/payouts?period=${period}`),
  });
}

// ── Dashboard tipado por rol (sin casts `as`) ─────────────────────────────────

export function useAdminDashboard(role: Role | undefined) {
  const api = useApiClient();
  return useQuery<AdminDashboardData>({
    queryKey: qk.dashboard('admin'),
    queryFn: () => api<AdminDashboardData>('/api/v1/dashboard/admin'),
    enabled: role === 'ADMIN',
  });
}

export function useTeacherDashboard(role: Role | undefined) {
  const api = useApiClient();
  return useQuery<TeacherDashboardData>({
    queryKey: qk.dashboard('teacher'),
    queryFn: () => api<TeacherDashboardData>('/api/v1/dashboard/teacher'),
    enabled: role === 'TEACHER',
  });
}

export function useStudentDashboard(role: Role | undefined) {
  const api = useApiClient();
  return useQuery<StudentDashboardData>({
    queryKey: qk.dashboard('student'),
    queryFn: () => api<StudentDashboardData>('/api/v1/dashboard/student'),
    enabled: role === 'STUDENT',
  });
}
