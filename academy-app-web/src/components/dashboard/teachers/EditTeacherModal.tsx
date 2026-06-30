import { useMutation } from '@tanstack/react-query';
import { type SubmitEvent, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ResponsiveModal } from '@/components/ui/ResponsiveModal';
import { useApiClient } from '@/lib/api';
import { getErrorMessage } from '@/lib/errorMessages';
import type { TeacherProfile } from '@/lib/interfaces/teachers';

type EditTeacherModalProps = {
  teacher: TeacherProfile | null;
  onClose: () => void;
  onUpdated: (message: string) => void;
};

export function EditTeacherModal({ teacher, onClose, onUpdated }: EditTeacherModalProps) {
  const apiClient = useApiClient();
  const [name, setName] = useState('');
  const [hourlyRateStr, setHourlyRateStr] = useState('');
  const [prevTeacherId, setPrevTeacherId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (teacher && teacher.id !== prevTeacherId) {
    setPrevTeacherId(teacher.id);
    setHourlyRateStr(teacher.hourlyRate != null ? String(teacher.hourlyRate) : '');
  }

  function handleClose() {
    setName('');
    setHourlyRateStr('');
    setError(null);
    onClose();
  }

  const displayedName = teacher ? name || teacher.name || '' : '';

  const updateMutation = useMutation({
    mutationFn: async ({ trimmed, hourlyRate }: { trimmed: string; hourlyRate: number | null }) => {
      await apiClient(`/api/v1/teachers/${teacher!.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: trimmed, hourlyRate }),
      });
    },
    onSuccess: () => {
      onUpdated('Información del profesor actualizada.');
      handleClose();
    },
    onError: (err) => {
      setError(getErrorMessage(err, 'Error al actualizar.'));
    },
  });

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!teacher) return;

    const trimmed = displayedName.replace(/\s+/g, ' ').trim();

    if (!trimmed) {
      setError('El nombre es requerido.');
      return;
    }

    const rateRaw = hourlyRateStr.trim();
    const hourlyRate = rateRaw === '' ? null : Number(rateRaw);
    if (rateRaw !== '' && (isNaN(hourlyRate!) || hourlyRate! < 0)) {
      setError('El costo por hora debe ser un número positivo.');
      return;
    }

    updateMutation.mutate({ trimmed, hourlyRate });
  }

  return (
    <ResponsiveModal isOpen={!!teacher} onClose={handleClose} title="Editar Profesor">
      {teacher && (
        <form className="space-y-4 px-6 py-6" onSubmit={handleSubmit}>
          <Input
            label="Nombre completo"
            value={displayedName}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre del profesor"
            disabled={updateMutation.isPending}
          />
          <Input label="Email" value={teacher.email} disabled className="bg-gray-50" />
          <Input
            type="number"
            label="Costo por hora (opcional)"
            placeholder="Ej. 5000"
            value={hourlyRateStr}
            onChange={(e) => setHourlyRateStr(e.target.value)}
            disabled={updateMutation.isPending}
          />
          {error && <p className="text-danger text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outlined"
              color="neutral"
              className="flex-1"
              onClick={handleClose}
              disabled={updateMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      )}
    </ResponsiveModal>
  );
}
