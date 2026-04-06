import { useState } from 'react';
import { X, UserX, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { InlineSpinner } from '@/components/ui/Spinner';
import { getInitials, formatTime } from '@/utils/general';
import { useApiClient } from '@/lib/api';
import { getErrorMessage } from '@/lib/errorMessages';
import type { Cls } from './classes.types';

type EnrolledStudent = {
  id: string;
  studentId: string;
  status: string;
  student: { id: string; name: string; email: string };
};

type Props = {
  cls: Cls;
  onClose: () => void;
};

export function ClassStudentsModal({ cls, onClose }: Props) {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['class-attendances', cls.id],
    queryFn: () => apiClient<{ attendances: EnrolledStudent[] }>(`/api/v1/classes/${cls.id}/attendances`),
  });

  const removeMutation = useMutation({
    mutationFn: (attendanceId: string) =>
      apiClient(`/api/v1/classes/${cls.id}/attendances/${attendanceId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-attendances', cls.id] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
    onError: (err) => {
      setError(getErrorMessage(err, 'No se pudo eliminar al estudiante'));
    },
  });

  const start = new Date(cls.startsAt);
  const end = new Date(cls.endsAt);
  const enrolledCount = data?.attendances.length ?? cls._count.attendances;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.2 }}
        className="flex w-full max-w-md flex-col rounded-2xl bg-white shadow-xl"
        style={{ maxHeight: '80vh' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-dark text-base font-bold">{cls.name}</h2>
            <p className="mt-0.5 text-xs text-gray-400">
              {new Intl.DateTimeFormat('es-CR', { weekday: 'long', day: 'numeric', month: 'short' }).format(start)}
              {' · '}
              {formatTime(start)} — {formatTime(end)}
              {' · '}
              <span className={cn(enrolledCount >= cls.maxCapacity ? 'text-danger font-semibold' : '')}>
                {enrolledCount}/{cls.maxCapacity} inscritos
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="mt-0.5 shrink-0 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {error && (
            <div className="mb-3 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
              <button onClick={() => setError(null)} className="ml-2 underline text-xs">Cerrar</button>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-8">
              <InlineSpinner />
            </div>
          ) : !data?.attendances.length ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Users className="h-10 w-10 text-gray-200" />
              <p className="text-sm text-gray-400">Sin estudiantes inscritos</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.attendances.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"
                >
                  <div className="bg-dark flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                    <span className="text-xs font-bold text-white">
                      {getInitials(att.student.name)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-dark truncate text-sm font-semibold">{att.student.name}</p>
                    <p className="truncate text-xs text-gray-400">{att.student.email}</p>
                  </div>
                  <Button
                    variant="text"
                    color="neutral"
                    onClick={() => {
                      setRemovingId(att.id);
                      setError(null);
                      removeMutation.mutate(att.id, {
                        onSettled: () => setRemovingId(null),
                      });
                    }}
                    disabled={removeMutation.isPending && removingId === att.id}
                    className="h-8 w-8 shrink-0 p-0 text-gray-400 hover:text-danger"
                    title="Quitar de la clase"
                  >
                    {removeMutation.isPending && removingId === att.id ? (
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-danger" />
                    ) : (
                      <UserX className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
