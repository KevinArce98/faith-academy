import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Check, Clock, Loader2, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { LEVEL_COLORS, LEVEL_LABELS } from '@/components/dashboard/classes/classes.types';
import { Button } from '@/components/ui/Button';
import { InlineSpinner } from '@/components/ui/Spinner';
import { useApiClient } from '@/lib/api';
import { cn } from '@/lib/cn';
import { getErrorMessage } from '@/lib/errorMessages';

type Cls = {
  id: string;
  name: string;
  skillLevel: string;
  schedule?: string | null;
  isPrivate?: boolean;
};

type EnrollData = {
  enrolledClassIds: string[];
  active: boolean;
  allowance: number | null; // null = ilimitado
  needsRenewal: boolean;
  singleClass: boolean; // clase suelta → la clase ya está reservada
  expiresAt: string | null;
};

function formatExpiry(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-CR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function MyClasses() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: classesData, isLoading: classesLoading } = useQuery<{
    classes: Cls[];
  }>({
    queryKey: ['classes'],
    queryFn: () => apiClient<{ classes: Cls[] }>('/api/v1/classes'),
  });

  const { data: enrollData, isLoading: enrollLoading } = useQuery<EnrollData>({
    queryKey: ['my-enrollments'],
    queryFn: () => apiClient<EnrollData>('/api/v1/monthly-attendance/me'),
  });

  const enrolled = new Set(enrollData?.enrolledClassIds ?? []);
  const active = enrollData?.active ?? false;
  const needsRenewal = enrollData?.needsRenewal ?? false;
  const singleClass = enrollData?.singleClass ?? false;
  const expiresAt = enrollData?.expiresAt ?? null;
  const allowance = enrollData?.allowance ?? null;
  const unlimited = active && allowance === null;
  const atLimit = active && allowance !== null && enrolled.size >= allowance;

  const mutation = useMutation({
    mutationFn: ({ classId, isEnrolled }: { classId: string; isEnrolled: boolean }) =>
      apiClient('/api/v1/monthly-attendance/me', {
        method: isEnrolled ? 'DELETE' : 'POST',
        body: JSON.stringify({ classId }),
      }),
    onMutate: ({ classId }) => {
      setError(null);
      setSavingId(classId);
    },
    onError: (err) => setError(getErrorMessage(err, 'No se pudo actualizar la inscripción.')),
    onSettled: async () => {
      setSavingId(null);
      await queryClient.invalidateQueries({ queryKey: ['my-enrollments'] });
    },
  });

  if (classesLoading || enrollLoading) return <InlineSpinner />;

  // Las clases privadas (compañía/audición) no se auto-inscriben.
  const classes = (classesData?.classes ?? []).filter((c) => !c.isPrivate);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-dark text-2xl font-bold md:text-3xl">Mis Clases</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            {singleClass
              ? 'Tu clase suelta ya está reservada para la fecha que elegiste.'
              : 'Inscríbete en las clases que quieras tomar este mes.'}
          </p>
        </div>
        {active && (
          <span className="bg-primary/10 text-primary w-fit shrink-0 rounded-full px-3 py-1 text-sm font-semibold">
            {unlimited
              ? `${enrolled.size} inscritas · ilimitado`
              : `${enrolled.size} de ${allowance} usadas`}
          </span>
        )}
      </div>

      {active && !singleClass && expiresAt && (
        <p className="text-sm text-gray-500">
          Tu plan está activo hasta el{' '}
          <span className="font-semibold">{formatExpiry(expiresAt)}</span>.
        </p>
      )}

      {!active && (
        <div className="border-warning/30 bg-warning/10 flex flex-col gap-2 rounded-xl border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="text-warning flex items-start gap-2 font-medium">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {needsRenewal
                ? 'Tu plan ya no está activo. Renueva tu mensualidad para inscribirte en clases.'
                : 'Necesitas una mensualidad activa para inscribirte en clases.'}
            </span>
          </div>
          <Link to="/payments" className="shrink-0">
            <Button
              variant="contained"
              color="primary"
              className="h-9 w-full rounded-lg text-sm sm:w-auto"
            >
              Renovar plan
            </Button>
          </Link>
        </div>
      )}

      {error && (
        <div className="border-danger/20 bg-danger/10 text-danger rounded-xl border px-4 py-3 text-sm font-medium">
          {error}
        </div>
      )}

      {classes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center text-sm text-gray-400">
          No hay clases disponibles por ahora.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls) => {
            const isEnrolled = enrolled.has(cls.id);
            const saving = savingId === cls.id;
            const blocked = !isEnrolled && (!active || atLimit);
            // Clase suelta: la reserva es fija, no se puede cambiar.
            const locked = singleClass && isEnrolled;
            return (
              <div
                key={cls.id}
                className={cn(
                  'flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-sm transition-colors',
                  isEnrolled ? 'border-primary' : 'border-gray-100'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-dark font-bold">{cls.name}</h2>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase',
                      LEVEL_COLORS[cls.skillLevel] ?? 'bg-gray-100 text-gray-500'
                    )}
                  >
                    {LEVEL_LABELS[cls.skillLevel] ?? cls.skillLevel}
                  </span>
                </div>

                {cls.schedule && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4 text-gray-300" />
                    {cls.schedule}
                  </div>
                )}

                <Button
                  variant={isEnrolled ? 'outlined' : 'contained'}
                  color={isEnrolled ? 'neutral' : 'primary'}
                  className="mt-auto w-full"
                  disabled={saving || blocked || locked}
                  title={
                    locked
                      ? 'Tu reserva de clase suelta no se puede cambiar'
                      : blocked && atLimit
                        ? 'Llegaste al límite de clases de tu plan'
                        : undefined
                  }
                  onClick={() => mutation.mutate({ classId: cls.id, isEnrolled })}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : locked ? (
                    <>
                      <Check className="h-4 w-4" /> Reservada
                    </>
                  ) : isEnrolled ? (
                    <>
                      <Check className="h-4 w-4" /> Inscrito
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" /> Inscribirme
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
