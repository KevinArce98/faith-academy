import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/cn';
import { modalVariants, overlayVariants } from '@/lib/animations';
import { useApiClient } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import type { Teacher } from './classes.types';

const DAYS_ABBR = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

type NewClassModalProps = {
  teachers: Teacher[];
  weekStart: Date;
  onClose: () => void;
};

export function NewClassModal({
  teachers,
  weekStart,
  onClose,
}: NewClassModalProps) {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  function toggleDay(i: number) {
    setSelectedDays((prev) =>
      prev.includes(i) ? prev.filter((d) => d !== i) : [...prev, i]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (selectedDays.length === 0) {
      setError('Selecciona al menos un dia de la semana');
      return;
    }

    const form = e.currentTarget;
    const data = new FormData(form);
    const startTime = data.get('startTime') as string;
    const endTime = data.get('endTime') as string;

    const occurrences = selectedDays.map((dayIndex) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + dayIndex);
      const [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      const startsAt = new Date(date);
      startsAt.setHours(sh, sm, 0, 0);
      const endsAt = new Date(date);
      endsAt.setHours(eh, em, 0, 0);
      return { startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() };
    });

    setLoading(true);
    try {
      await apiClient('/api/v1/classes', {
        method: 'POST',
        body: JSON.stringify({
          name: data.get('name') as string,
          skillLevel: data.get('skillLevel') as string,
          teacherId: data.get('teacherId') as string,
          maxCapacity: parseInt(data.get('capacity') as string),
          cancelWindowHours: parseInt(data.get('cancelWindow') as string),
          description: (data.get('description') as string) || undefined,
          occurrences,
        }),
      });

      await queryClient.invalidateQueries({ queryKey: ['classes'] });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la clase');
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
          <h2 className="text-dark text-lg font-bold">Nueva Clase</h2>
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
            required
          />
          <Select name="skillLevel" label="Nivel">
            <option value="BEGINNER">Basico</option>
            <option value="INTERMEDIATE">Intermedio</option>
            <option value="ADVANCED">Avanzado</option>
            <option value="MASTER">Master</option>
          </Select>

          <div>
            <label className="text-dark mb-2 block text-sm font-medium">
              Dias de la semana
            </label>
            <div className="flex gap-2">
              {DAYS_ABBR.map((d, i) => (
                <Button
                  key={i}
                  type="button"
                  onClick={() => toggleDay(i)}
                  variant={selectedDays.includes(i) ? 'contained' : 'text'}
                  color={selectedDays.includes(i) ? 'dark' : 'neutral'}
                  className={cn(
                    'h-9 w-9 rounded-xl p-0',
                    !selectedDays.includes(i) &&
                      'border-transparent bg-gray-100 text-gray-400 hover:bg-gray-200'
                  )}
                >
                  {d}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              name="startTime"
              type="time"
              label="Hora inicio"
              defaultValue="09:00"
            />
            <Input
              name="endTime"
              type="time"
              label="Hora fin"
              defaultValue="10:00"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              name="capacity"
              type="number"
              label="Capacidad maxima"
              defaultValue={20}
            />
            <Input
              name="cancelWindow"
              type="number"
              label="Ventana de cancelacion"
              defaultValue={24}
              endAdornment="horas"
            />
          </div>

          <Select name="teacherId" label="Profesor asignado">
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
              {loading ? 'Creando...' : 'Crear Clase'}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
