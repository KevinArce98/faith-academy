import { useState } from 'react';
import { useScrollLock } from '@/hooks/useScrollLock';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { modalVariants, overlayVariants } from '@/lib/animations';
import { useApiClient } from '@/lib/api';
import { formatTime } from '@/utils/general';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import type { Cls, Teacher } from './classes.types';

type EditClassModalProps = {
  classData: Cls;
  teachers: Teacher[];
  onClose: () => void;
};

export function EditClassModal({
  classData,
  teachers,
  onClose,
}: EditClassModalProps) {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useScrollLock(true);

  const start = new Date(classData.startsAt);
  const end = new Date(classData.endsAt);
  const startTime = formatTime(start);
  const endTime = formatTime(end);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const data = new FormData(form);
    const startValue = data.get('startTime') as string;
    const endValue = data.get('endTime') as string;

    const [sh, sm] = startValue.split(':').map(Number);
    const [eh, em] = endValue.split(':').map(Number);

    const startDateTime = new Date(start);
    startDateTime.setHours(sh, sm, 0, 0);
    const endDateTime = new Date(start);
    endDateTime.setHours(eh, em, 0, 0);

    if (endDateTime <= startDateTime) {
      setError('La hora de fin debe ser posterior a la hora de inicio');
      return;
    }

    setLoading(true);
    try {
      await apiClient(`/api/v1/classes/${classData.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: data.get('name') as string,
          skillLevel: data.get('skillLevel') as string,
          teacherId: data.get('teacherId') as string,
          maxCapacity: parseInt(data.get('capacity') as string),
          cancelWindowHours: parseInt(data.get('cancelWindow') as string),
          description: (data.get('description') as string) || undefined,
          startsAt: startDateTime.toISOString(),
          endsAt: endDateTime.toISOString(),
        }),
      });

      await queryClient.invalidateQueries({ queryKey: ['classes'] });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la clase');
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center md:p-4"
      onClick={onClose}
      variants={overlayVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <motion.div
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl md:max-w-lg md:rounded-2xl"
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="h-1 w-10 rounded-full bg-gray-300" />
        </div>
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
          <h2 className="text-dark text-lg font-bold">Editar Clase</h2>
          <Button
            variant="text"
            color="neutral"
            onClick={onClose}
            className="h-auto p-1"
          >
            <X className="h-5 w-5 text-gray-400" />
          </Button>
        </div>
        <form className="space-y-5 p-6" onSubmit={handleSubmit}>
          <Input
            name="name"
            label="Nombre de la clase"
            placeholder="Ej. Ballet Basico — Grupo A"
            defaultValue={classData.name}
            required
          />
          <Select
            name="skillLevel"
            label="Nivel"
            defaultValue={classData.skillLevel}
          >
            <option value="BEGINNER">Basico</option>
            <option value="INTERMEDIATE">Intermedio</option>
            <option value="ADVANCED">Avanzado</option>
            <option value="MASTER">Master</option>
          </Select>

          <div className="grid grid-cols-2 gap-4">
            <Input
              name="startTime"
              type="time"
              label="Hora inicio"
              defaultValue={startTime}
            />
            <Input
              name="endTime"
              type="time"
              label="Hora fin"
              defaultValue={endTime}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              name="capacity"
              type="number"
              label="Capacidad maxima"
              defaultValue={classData.maxCapacity}
            />
            <Input
              name="cancelWindow"
              type="number"
              label="Ventana de cancelacion"
              defaultValue={24}
              endAdornment="horas"
            />
          </div>

          <Select
            name="teacherId"
            label="Profesor asignado"
            defaultValue={classData.teacherId}
          >
            <option value="">Seleccionar profesor</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                Prof. {t.name || 'Sin nombre'}
              </option>
            ))}
          </Select>

          <Textarea
            name="description"
            label="Descripcion"
            placeholder="Descripcion breve de la clase..."
            rows={3}
            hint="Opcional"
            defaultValue={classData.description || ''}
          />

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="text"
              color="neutral"
              onClick={onClose}
              className="h-11 flex-1 rounded-xl border border-gray-200 hover:bg-gray-50"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              className="h-11 flex-1 rounded-xl"
              disabled={loading}
            >
              {loading ? 'Actualizando...' : 'Actualizar Clase'}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
