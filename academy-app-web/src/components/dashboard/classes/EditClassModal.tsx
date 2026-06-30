import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import { Input } from '@/components/ui/Input';
import { SelectMenu } from '@/components/ui/SelectMenu';
import { Textarea } from '@/components/ui/Textarea';
import { TimePicker } from '@/components/ui/TimePicker';
import { useScrollLock } from '@/hooks/useScrollLock';
import { modalVariants, overlayVariants } from '@/lib/animations';
import { useApiClient } from '@/lib/api';
import { cn } from '@/lib/cn';
import { getErrorMessage } from '@/lib/errorMessages';

import { ScheduleEditor } from './ScheduleEditor';
import { type Cls, LEVEL_OPTIONS, type Slot, type Teacher, dowFromDate } from './classes.types';

type EditClassModalProps = {
  cls: Cls;
  teachers: Teacher[];
  onClose: () => void;
};

export function EditClassModal({ cls, teachers, onClose }: EditClassModalProps) {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>(cls.slots ?? []);
  const [teacherId, setTeacherId] = useState(cls.teacherId);
  const [skillLevel, setSkillLevel] = useState(cls.skillLevel);
  const [isPrivate, setIsPrivate] = useState(cls.isPrivate ?? false);
  const [isOneOff, setIsOneOff] = useState(!!cls.oneOffDate);
  const [oneOffDate, setOneOffDate] = useState(cls.oneOffDate ?? '');
  const [oneOffStart, setOneOffStart] = useState(cls.slots?.[0]?.startTime ?? '17:00');
  const [oneOffEnd, setOneOffEnd] = useState(cls.slots?.[0]?.endTime ?? '18:00');

  useScrollLock(true);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!teacherId) {
      setError('Selecciona un profesor');
      return;
    }

    if (isOneOff && !oneOffDate) {
      setError('Elige la fecha de la clase única');
      return;
    }

    const finalSlots: Slot[] = isOneOff
      ? [
          {
            dayOfWeek: dowFromDate(oneOffDate),
            startTime: oneOffStart,
            endTime: oneOffEnd,
          },
        ]
      : slots;

    const data = new FormData(e.currentTarget);
    const capacityRaw = (data.get('capacity') as string)?.trim();

    setLoading(true);
    try {
      await apiClient(`/api/v1/classes/${cls.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: data.get('name') as string,
          teacherId,
          slots: finalSlots,
          skillLevel,
          maxCapacity: capacityRaw ? parseInt(capacityRaw, 10) : 0,
          description: (data.get('description') as string) || '',
          isPrivate,
          oneOffDate: isOneOff ? oneOffDate : null,
        }),
      });

      await queryClient.invalidateQueries({ queryKey: ['classes'] });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo actualizar la clase'));
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
          <Button variant="text" color="neutral" onClick={onClose} className="h-auto p-1">
            <X className="h-5 w-5 text-gray-400" />
          </Button>
        </div>
        <form className="space-y-5 p-6" onSubmit={handleSubmit}>
          <Input name="name" label="Nombre de la clase" defaultValue={cls.name} required />

          <SelectMenu
            label="Profesor"
            placeholder="Seleccionar profesor"
            value={teacherId}
            onChange={setTeacherId}
            options={teachers.map((t) => ({
              value: t.id,
              label: `Prof. ${t.name || 'Sin nombre'}`,
            }))}
          />

          <div className="grid grid-cols-2 gap-4">
            <SelectMenu
              label="Nivel"
              value={skillLevel}
              onChange={setSkillLevel}
              options={LEVEL_OPTIONS.map((opt) => ({
                value: opt.value,
                label: opt.label,
              }))}
            />
            <Input
              name="capacity"
              type="number"
              min="0"
              label="Capacidad máxima"
              placeholder="0 = sin límite"
              defaultValue={cls.maxCapacity ?? 0}
            />
          </div>

          <label className="flex cursor-pointer items-center justify-between gap-3">
            <span className="text-dark text-sm font-medium">Clase única (una sola fecha)</span>
            <button
              type="button"
              role="switch"
              aria-checked={isOneOff}
              onClick={() => setIsOneOff((v) => !v)}
              className={cn(
                'relative h-6 w-11 shrink-0 rounded-full transition-colors',
                isOneOff ? 'bg-primary' : 'bg-gray-200'
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                  isOneOff ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </label>

          {isOneOff ? (
            <div className="space-y-3">
              <DatePicker label="Fecha de la clase" value={oneOffDate} onChange={setOneOffDate} />
              <div className="flex items-end gap-2">
                <TimePicker
                  label="Inicio"
                  value={oneOffStart}
                  onChange={setOneOffStart}
                  className="flex-1"
                />
                <span className="pb-3 text-gray-400">–</span>
                <TimePicker
                  label="Fin"
                  value={oneOffEnd}
                  onChange={setOneOffEnd}
                  className="flex-1"
                />
              </div>
            </div>
          ) : (
            <ScheduleEditor value={slots} onChange={setSlots} />
          )}

          <Textarea
            name="description"
            label="Descripción"
            rows={3}
            defaultValue={cls.description ?? ''}
          />

          <label className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-gray-100 p-3">
            <span>
              <span className="text-dark block text-sm font-medium">Clase privada</span>
              <span className="block text-xs text-gray-400">
                Solo el admin inscribe alumnos (compañía/audición). Oculta para quien no esté
                asignado.
              </span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={isPrivate}
              onClick={() => setIsPrivate((v) => !v)}
              className={cn(
                'relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors',
                isPrivate ? 'bg-primary' : 'bg-gray-200'
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                  isPrivate ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </label>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

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
              {loading ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
