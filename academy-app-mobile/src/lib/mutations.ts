import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useApiClient } from '@/lib/api';
import { qk } from '@/lib/queryKeys';

// Capa de mutaciones de dominio: cada hook encapsula endpoint + invalidaciones
// (complemento de queries.ts). El feedback de UI (errores, cerrar sheets,
// spinners por fila) vive en el componente vía `callbacks`.

type Callbacks<TVars = void, TData = unknown> = {
  onMutate?: (vars: TVars) => void;
  onSuccess?: (data: TData, vars: TVars) => void;
  onError?: (err: Error, vars: TVars) => void;
  onSettled?: () => void;
};

export type CreateUserResult = { tempPassword: string; userId?: string };

// ── Alumnos ───────────────────────────────────────────────────────────────────

export function useCreateStudent(cb?: Callbacks<Record<string, unknown>, CreateUserResult>) {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api<CreateUserResult>('/api/v1/students', { method: 'POST', body: JSON.stringify(body) }),
    onMutate: cb?.onMutate,
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: qk.students });
      qc.invalidateQueries({ queryKey: qk.dashboardAll });
      cb?.onSuccess?.(data, vars);
    },
    onError: cb?.onError,
    onSettled: cb?.onSettled,
  });
}

export function useUpdateStudent(studentId: string, cb?: Callbacks<Record<string, unknown>>) {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api(`/api/v1/students/${studentId}`, { method: 'PUT', body: JSON.stringify(body) }),
    onMutate: cb?.onMutate,
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: qk.students });
      cb?.onSuccess?.(data, vars);
    },
    onError: cb?.onError,
    onSettled: cb?.onSettled,
  });
}

// ── Profesores ────────────────────────────────────────────────────────────────

export function useCreateTeacher(
  cb?: Callbacks<{ name: string; email: string; hourlyRate?: number }, CreateUserResult>,
) {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; email: string; hourlyRate?: number }) =>
      api<CreateUserResult>('/api/v1/teachers', { method: 'POST', body: JSON.stringify(body) }),
    onMutate: cb?.onMutate,
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: qk.teachers });
      qc.invalidateQueries({ queryKey: qk.assignableTeachers });
      cb?.onSuccess?.(data, vars);
    },
    onError: cb?.onError,
    onSettled: cb?.onSettled,
  });
}

export function useUpdateTeacher(teacherId: string, cb?: Callbacks<Record<string, unknown>>) {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api(`/api/v1/teachers/${teacherId}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onMutate: cb?.onMutate,
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: qk.teachers });
      qc.invalidateQueries({ queryKey: qk.assignableTeachers });
      cb?.onSuccess?.(data, vars);
    },
    onError: cb?.onError,
    onSettled: cb?.onSettled,
  });
}

export function useDeleteTeacher(teacherId: string, cb?: Callbacks) {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api(`/api/v1/teachers/${teacherId}`, { method: 'DELETE' }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: qk.teachers });
      qc.invalidateQueries({ queryKey: qk.assignableTeachers });
      cb?.onSuccess?.(data, undefined as void);
    },
    onError: (err) => cb?.onError?.(err, undefined as void),
    onSettled: cb?.onSettled,
  });
}

// ── Clases ────────────────────────────────────────────────────────────────────

export function useCreateClass(cb?: Callbacks<Record<string, unknown>>) {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api('/api/v1/classes', { method: 'POST', body: JSON.stringify(body) }),
    onMutate: cb?.onMutate,
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: qk.classes });
      cb?.onSuccess?.(data, vars);
    },
    onError: cb?.onError,
    onSettled: cb?.onSettled,
  });
}

export function useUpdateClass(classId: string, cb?: Callbacks<Record<string, unknown>>) {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api(`/api/v1/classes/${classId}`, { method: 'PUT', body: JSON.stringify(body) }),
    onMutate: cb?.onMutate,
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: qk.classes });
      cb?.onSuccess?.(data, vars);
    },
    onError: cb?.onError,
    onSettled: cb?.onSettled,
  });
}

export function useDeleteClass(classId: string, cb?: Callbacks) {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api(`/api/v1/classes/${classId}`, { method: 'DELETE' }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: qk.classes });
      cb?.onSuccess?.(data, undefined as void);
    },
    onError: (err) => cb?.onError?.(err, undefined as void),
    onSettled: cb?.onSettled,
  });
}

// ── Planes ────────────────────────────────────────────────────────────────────

/** Crea (sin planId) o actualiza (con planId) un plan. */
export function useSavePlan(planId: string | undefined, cb?: Callbacks<Record<string, unknown>>) {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      planId
        ? api(`/api/v1/plans/${planId}`, { method: 'PUT', body: JSON.stringify(body) })
        : api('/api/v1/plans', { method: 'POST', body: JSON.stringify(body) }),
    onMutate: cb?.onMutate,
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: qk.plans });
      cb?.onSuccess?.(data, vars);
    },
    onError: cb?.onError,
    onSettled: cb?.onSettled,
  });
}

export function useTogglePlan(cb?: Callbacks<{ id: string; isActive: boolean }>) {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api(`/api/v1/plans/${id}/toggle`, { method: 'PATCH', body: JSON.stringify({ isActive }) }),
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: qk.plans });
      qc.invalidateQueries({ queryKey: qk.dashboardAll });
      cb?.onSuccess?.(data, vars);
    },
    onError: cb?.onError,
    onSettled: cb?.onSettled,
  });
}

export function useDeletePlan(cb?: Callbacks<string>) {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/api/v1/plans/${id}`, { method: 'DELETE' }),
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: qk.plans });
      cb?.onSuccess?.(data, vars);
    },
    onError: cb?.onError,
    onSettled: cb?.onSettled,
  });
}

// ── Pagos ─────────────────────────────────────────────────────────────────────

type OrderKind = 'PLAN' | 'ENROLLMENT';

function basePathFor(kind?: OrderKind): string {
  return kind === 'ENROLLMENT' ? '/api/v1/payments/enrollment' : '/api/v1/payments/orders';
}

export function useApproveOrder(cb?: Callbacks<{ id: string; kind?: OrderKind }>) {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, kind }: { id: string; kind?: OrderKind }) =>
      api(`${basePathFor(kind)}/${id}/approve`, { method: 'POST' }),
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: qk.payments });
      qc.invalidateQueries({ queryKey: qk.dashboardAll });
      qc.invalidateQueries({ queryKey: qk.enrollmentStatus() });
      cb?.onSuccess?.(data, vars);
    },
    onError: cb?.onError,
    onSettled: cb?.onSettled,
  });
}

export function useRejectOrder(
  cb?: Callbacks<{ id: string; kind?: OrderKind; notes?: string }>,
) {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, kind, notes }: { id: string; kind?: OrderKind; notes?: string }) =>
      api(`${basePathFor(kind)}/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ notes }),
      }),
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: qk.payments });
      qc.invalidateQueries({ queryKey: qk.dashboardAll });
      cb?.onSuccess?.(data, vars);
    },
    onError: cb?.onError,
    onSettled: cb?.onSettled,
  });
}

/** El admin marca la matrícula de un alumno como pagada (sin comprobante). */
export function useMarkEnrollmentPaid(cb?: Callbacks<string>) {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (studentId: string) =>
      api('/api/v1/payments/enrollment/mark-paid', {
        method: 'POST',
        body: JSON.stringify({ studentId }),
      }),
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: qk.payments });
      qc.invalidateQueries({ queryKey: qk.enrollmentStatus(vars) });
      cb?.onSuccess?.(data, vars);
    },
    onError: cb?.onError,
    onSettled: cb?.onSettled,
  });
}

// ── Mensualidades (cobranza del admin) ───────────────────────────────────────

export type PayPendingInput = {
  subscriptionId: string | null;
  studentId: string;
  planId?: string;
};

// 'pending' → marca pagada la mensualidad; sin subscriptionId → crea/renueva la
// del mes actual (nuevo ciclo de aniversario).
export function usePaySubscription(cb?: Callbacks<PayPendingInput>) {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: PayPendingInput) =>
      p.subscriptionId
        ? api(`/api/v1/subscriptions/${p.subscriptionId}/pay`, {
            method: 'PATCH',
            body: JSON.stringify({ isPaid: true }),
          })
        : api('/api/v1/subscriptions', {
            method: 'POST',
            body: JSON.stringify({ studentId: p.studentId, planId: p.planId, isPaid: true }),
          }),
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: qk.dashboardAll });
      qc.invalidateQueries({ queryKey: qk.students });
      cb?.onSuccess?.(data, vars);
    },
    onError: cb?.onError,
    onSettled: cb?.onSettled,
  });
}

// ── Inscripciones mensuales ──────────────────────────────────────────────────

/** Auto-inscripción del alumno (mis clases). */
export function useSelfEnrollment(cb?: Callbacks<{ classId: string; isEnrolled: boolean }>) {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ classId, isEnrolled }: { classId: string; isEnrolled: boolean }) =>
      api('/api/v1/monthly-attendance/me', {
        method: isEnrolled ? 'DELETE' : 'POST',
        body: JSON.stringify({ classId }),
      }),
    onMutate: cb?.onMutate,
    onSuccess: cb?.onSuccess,
    onError: cb?.onError,
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: qk.myEnrollments });
      cb?.onSettled?.();
    },
  });
}

/** Inscripción gestionada por el admin para un [alumno, clase, mes]. */
export function useAdminEnrollment(
  period: string,
  classId: string,
  cb?: Callbacks<{ studentId: string; enrolled: boolean }>,
) {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, enrolled }: { studentId: string; enrolled: boolean }) =>
      api('/api/v1/monthly-attendance', {
        method: enrolled ? 'DELETE' : 'POST',
        body: JSON.stringify({ classId, period, studentId }),
      }),
    onMutate: cb?.onMutate,
    onSuccess: cb?.onSuccess,
    onError: cb?.onError,
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: qk.monthlyAttendance(period, classId) });
      cb?.onSettled?.();
    },
  });
}

// ── Asistencia de sesión (pasar lista) ───────────────────────────────────────

/** Marca/desmarca presencia: `present` es el estado ACTUAL (true → se quita). */
export function useSetSessionAttendance(
  classId: string,
  date: string,
  cb?: Callbacks<{ studentId: string; present: boolean }>,
) {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, present }: { studentId: string; present: boolean }) =>
      api('/api/v1/session-attendance', {
        method: present ? 'DELETE' : 'POST',
        body: JSON.stringify({ classId, date, studentId }),
      }),
    onMutate: cb?.onMutate,
    onSuccess: cb?.onSuccess,
    onError: cb?.onError,
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: qk.sessionAttendance(classId, date) });
      cb?.onSettled?.();
    },
  });
}

// ── Notificaciones ───────────────────────────────────────────────────────────

export function useMarkNotificationsRead(cb?: Callbacks) {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api('/api/v1/notifications/read', { method: 'POST', body: JSON.stringify({}) }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: qk.notifications });
      cb?.onSuccess?.(data, undefined as void);
    },
    onError: (err) => cb?.onError?.(err, undefined as void),
    onSettled: cb?.onSettled,
  });
}
