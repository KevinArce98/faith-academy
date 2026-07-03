import { useQuery } from '@tanstack/react-query';

import { useApiClient } from '@/lib/api';
import type { MeResponse } from '@/lib/interfaces/auth';
import type { AssignableTeacher, Cls, StudentCls } from '@/lib/interfaces/classes';
import type {
  AdminDashboard,
  StudentDashboard,
  TeacherDashboard,
} from '@/lib/interfaces/dashboard';
import type { EnrollData, SubscriptionWithStudent } from '@/lib/interfaces/enrollment';
import type { Order } from '@/lib/interfaces/payments';
import type { PayoutsResponse } from '@/lib/interfaces/payouts';
import type { Plan } from '@/lib/interfaces/plans';
import type { Student } from '@/lib/interfaces/students';
import type { TeacherProfile } from '@/lib/interfaces/teachers';
import { qk } from '@/lib/queryKeys';
import type { Role } from '@/lib/roles';

// Capa de dominio: un hook por recurso. Encapsula endpoint, query key, staleTime
// y el desempaquetado de respuestas (`Array.isArray(res) ? res : res.x`), para
// que las pantallas no repitan URLs ni keys sueltas.

const ME_STALE = 5 * 60 * 1000;

/** Usuario autenticado + rol. Fuente única (antes copiado en ~8 pantallas). */
export function useMe(enabled = true) {
  const api = useApiClient();
  return useQuery<MeResponse>({
    queryKey: qk.me,
    queryFn: () => api<MeResponse>('/api/v1/auth/me'),
    staleTime: ME_STALE,
    enabled,
  });
}

/** Rol del usuario (STUDENT por defecto mientras carga). */
export function useRole(): Role {
  return useMe().data?.role ?? 'STUDENT';
}

export function usePlans(enabled = true) {
  const api = useApiClient();
  return useQuery<Plan[]>({
    queryKey: qk.plans,
    queryFn: async () => {
      const res = await api<Plan[] | { plans: Plan[] }>('/api/v1/plans');
      return Array.isArray(res) ? res : res.plans;
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

export function useTeachers() {
  const api = useApiClient();
  return useQuery<TeacherProfile[]>({
    queryKey: qk.teachers,
    queryFn: () => api<TeacherProfile[]>('/api/v1/teachers'),
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

/** Clases (admin/teacher). Para el alumno usar useStudentClasses. */
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

export function useStudentClasses() {
  const api = useApiClient();
  return useQuery<StudentCls[]>({
    queryKey: qk.classes,
    queryFn: async () => {
      const res = await api<{ classes: StudentCls[] }>('/api/v1/classes');
      return res.classes;
    },
  });
}

export function usePaymentOrders(enabled = true) {
  const api = useApiClient();
  return useQuery<Order[]>({
    queryKey: qk.payments,
    queryFn: async () => {
      const res = await api<Order[] | { orders: Order[] }>('/api/v1/payments/orders');
      return Array.isArray(res) ? res : res.orders;
    },
    enabled,
  });
}

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read: boolean;
  createdAt: string;
};

export function useNotifications() {
  const api = useApiClient();
  return useQuery<{ notifications: NotificationItem[]; unreadCount: number }>({
    queryKey: qk.notifications,
    queryFn: () =>
      api<{ notifications: NotificationItem[]; unreadCount: number }>('/api/v1/notifications'),
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

export function useSubscriptions(period: string) {
  const api = useApiClient();
  return useQuery<SubscriptionWithStudent[]>({
    queryKey: qk.subscriptions(period),
    queryFn: async () => {
      const res = await api<{ subscriptions: SubscriptionWithStudent[] }>(
        `/api/v1/subscriptions?period=${period}`,
      );
      return res.subscriptions;
    },
  });
}

// ── Dashboard tipado por rol (sin casts `as`) ─────────────────────────────────

export function useAdminDashboard(role: Role | undefined) {
  const api = useApiClient();
  return useQuery<AdminDashboard>({
    queryKey: qk.dashboard('admin'),
    queryFn: () => api<AdminDashboard>('/api/v1/dashboard/admin'),
    enabled: role === 'ADMIN',
  });
}

export function useTeacherDashboard(role: Role | undefined) {
  const api = useApiClient();
  return useQuery<TeacherDashboard>({
    queryKey: qk.dashboard('teacher'),
    queryFn: () => api<TeacherDashboard>('/api/v1/dashboard/teacher'),
    enabled: role === 'TEACHER',
  });
}

export function useStudentDashboard(role: Role | undefined) {
  const api = useApiClient();
  return useQuery<StudentDashboard>({
    queryKey: qk.dashboard('student'),
    queryFn: () => api<StudentDashboard>('/api/v1/dashboard/student'),
    enabled: role === 'STUDENT',
  });
}
