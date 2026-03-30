import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/lib/api';
import { GraduationCap, Calendar } from 'lucide-react';
import type { TeacherProfile } from '@shared/interfaces/teachers';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { NewTeacherModal } from './NewTeacherModal';
import { cn } from '@/lib/cn';
import { getInitials } from '@/utils/general';
import { ResponsiveModal } from '@/components/ui/ResponsiveModal';
import { EditTeacherModal } from './EditTeacherModal';
import { TeacherMenu } from './TeacherMenu';

const DATE_FORMAT = new Intl.DateTimeFormat('es-CR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

type TeachersClientProps = {
  teachers: TeacherProfile[];
  activeCount: number;
};

type ConfirmState =
  | { type: 'delete'; teacher: TeacherProfile }
  | { type: 'role'; teacher: TeacherProfile };

type ToastState = { type: 'success' | 'error'; message: string } | null;

export function TeachersClient({ teachers, activeCount }: TeachersClientProps) {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [editing, setEditing] = useState<TeacherProfile | null>(null);

  const totalTeachers = teachers.length;
  const emptyState = totalTeachers === 0;

  function closeMenus() {
    setMenuOpen(null);
  }

  async function toggleActive(teacher: TeacherProfile) {
    setLoadingId(teacher.id);
    closeMenus();
    try {
      await apiClient(`/api/v1/teachers/${teacher.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !teacher.isActive }),
      });
      setToast({
        type: 'success',
        message: teacher.isActive
          ? `${teacher.name ?? 'Profesor'} desactivado.`
          : `${teacher.name ?? 'Profesor'} activado.`,
      });
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    } catch (err) {
      setToast({ type: 'error', message: err instanceof Error ? err.message : 'Error al actualizar.' });
    } finally {
      setLoadingId(null);
    }
  }

  async function changeRoleToStudent(teacher: TeacherProfile) {
    setLoadingId(teacher.id);
    closeMenus();
    try {
      await apiClient(`/api/v1/teachers/${teacher.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: 'STUDENT' }),
      });
      setToast({ type: 'success', message: `${teacher.name ?? 'Profesor'} ahora es alumno.` });
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    } catch (err) {
      setToast({ type: 'error', message: err instanceof Error ? err.message : 'Error al cambiar el rol.' });
    } finally {
      setLoadingId(null);
      setConfirm(null);
    }
  }

  async function deleteTeacher(teacher: TeacherProfile) {
    setLoadingId(teacher.id);
    closeMenus();
    try {
      await apiClient(`/api/v1/teachers/${teacher.id}`, { method: 'DELETE' });
      setToast({ type: 'success', message: `${teacher.name ?? 'Profesor'} eliminado.` });
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    } catch (err) {
      setToast({ type: 'error', message: err instanceof Error ? err.message : 'Error al eliminar.' });
    } finally {
      setLoadingId(null);
      setConfirm(null);
    }
  }

  function renderClasses(teacher: TeacherProfile) {
    if (!teacher.clases.length) {
      return <p className="text-gray-400 text-sm italic">Sin clases asignadas</p>;
    }
    return (
      <div className="flex flex-wrap gap-2">
        {teacher.clases.map((cls) => (
          <span
            key={cls.id}
            className="bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-semibold"
          >
            {cls.name} · {cls.dayOfWeek} {cls.startTime}-{cls.endTime}
          </span>
        ))}
      </div>
    );
  }

  const toastClass = useMemo(() => {
    if (!toast) return '';
    return toast.type === 'success'
      ? 'bg-success/10 text-success border-success/20'
      : 'bg-danger/10 text-danger border-danger/20';
  }, [toast]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-dark text-3xl font-bold">Profesores</h1>
          <span className="text-gray-400 text-sm">{activeCount} profesores activos</span>
        </div>
        <Button className="h-11 rounded-xl px-5" onClick={() => setNewModalOpen(true)}>
          + Nuevo Profesor
        </Button>
      </div>

      {toast && (
        <div className={cn('rounded-xl border px-4 py-3 text-sm font-medium', toastClass)}>
          {toast.message}
        </div>
      )}

      {emptyState ? (
        <div className="bg-white flex flex-col items-center gap-4 rounded-3xl border border-dashed border-gray-200 px-8 py-16 text-center shadow-sm">
          <GraduationCap className="h-16 w-16 text-gray-200" />
          <div>
            <p className="text-dark text-2xl font-bold">No hay profesores registrados</p>
            <p className="text-gray-500 mt-2">
              Crea el primer profesor para asignar clases y monitorear su calendario.
            </p>
          </div>
          <Button className="h-11 rounded-xl px-5" onClick={() => setNewModalOpen(true)}>
            + Crear Primer Profesor
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {teachers.map((teacher) => {
            const badgeVariant = teacher.isActive ? 'success' : 'default';
            const badgeLabel = teacher.isActive ? 'Activo' : 'Inactivo';
            const createdAtLabel = DATE_FORMAT.format(new Date(teacher.createdAt));
            return (
              <div
                key={teacher.id}
                className="relative rounded-3xl border border-gray-100 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <div className="bg-dark flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white">
                    {getInitials(teacher.name ?? '')}
                  </div>
                  <div className="flex-1">
                    <p className="text-dark text-lg font-semibold">{teacher.name ?? 'Sin nombre'}</p>
                    <p className="text-gray-400 text-sm">{teacher.email}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={badgeVariant as never}>{badgeLabel}</Badge>
                    <TeacherMenu
                      teacher={teacher}
                      isOpen={menuOpen === teacher.id}
                      loading={loadingId === teacher.id}
                      onToggleMenu={() =>
                        setMenuOpen(menuOpen === teacher.id ? null : teacher.id)
                      }
                      onEdit={() => {
                        setEditing(teacher);
                        setMenuOpen(null);
                      }}
                      onChangeRole={() => {
                        setConfirm({ type: 'role', teacher });
                        setMenuOpen(null);
                      }}
                      onToggleActive={() => toggleActive(teacher)}
                      onDelete={() => {
                        setConfirm({ type: 'delete', teacher });
                        setMenuOpen(null);
                      }}
                    />
                  </div>
                </div>

                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Clases asignadas
                  </p>
                  <div className="mt-3">{renderClasses(teacher)}</div>
                </div>

                <div className="mt-6 flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {teacher.clases.length} clases activas
                  </div>
                  <p className="text-xs">Desde {createdAtLabel}</p>
                </div>

                {loadingId === teacher.id && (
                  <div className="absolute inset-0 rounded-3xl bg-white/60" aria-hidden />
                )}
              </div>
            );
          })}
        </div>
      )}

      <NewTeacherModal
        isOpen={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        onCreated={(message) => setToast({ type: 'success', message })}
      />

      <EditTeacherModal
        teacher={editing}
        onClose={() => setEditing(null)}
        onUpdated={(message) => {
          setToast({ type: 'success', message });
          setEditing(null);
          queryClient.invalidateQueries({ queryKey: ['teachers'] });
        }}
      />

      <ResponsiveModal
        isOpen={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm?.type === 'delete' ? 'Eliminar Profesor' : 'Cambiar a Alumno'}
      >
        {confirm && (
          <div className="space-y-4 p-6">
            <p className="text-gray-600 text-sm">
              {confirm.type === 'delete'
                ? `¿Eliminar a ${confirm.teacher.name ?? 'este profesor'}? Esta acción no se puede deshacer.`
                : `¿Promover a ${confirm.teacher.name ?? 'este profesor'} como Alumno? Se moverá a la sección de alumnos.`}
            </p>
            <div className="flex gap-3">
              <Button
                type="button"
                variant='outlined'
                color='neutral'
                className="flex-1"
                onClick={() => setConfirm(null)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                color={confirm.type === 'delete' ? 'danger' : 'primary'}
                className="flex-1"
                onClick={() =>
                  confirm.type === 'delete'
                    ? deleteTeacher(confirm.teacher)
                    : changeRoleToStudent(confirm.teacher)
                }
                disabled={loadingId === confirm.teacher.id}
              >
                Confirmar
              </Button>
            </div>
          </div>
        )}
      </ResponsiveModal>
    </div>
  );
}
