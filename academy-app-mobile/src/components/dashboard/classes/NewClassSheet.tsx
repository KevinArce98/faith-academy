import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Sheet } from '@/components/ui/Sheet';
import { Switch } from '@/components/ui/Switch';
import { getErrorMessage } from '@/lib/errorMessages';
import { useCreateClass } from '@/lib/mutations';

import { OneOffScheduleEditor, type OneOffValue } from './OneOffScheduleEditor';
import { ScheduleEditor } from './ScheduleEditor';
import { dowFromDate, LEVEL_OPTIONS, type Slot } from './classes.types';

export type AssignableTeacher = { id: string; name: string | null };

type NewClassSheetProps = {
  visible: boolean;
  onClose: () => void;
  teachers: AssignableTeacher[];
};

export function NewClassSheet({ visible, onClose, teachers }: NewClassSheetProps) {
  const [name, setName] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [skillLevel, setSkillLevel] = useState('BEGINNER');
  const [capacity, setCapacity] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isOneOff, setIsOneOff] = useState(false);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [oneOff, setOneOff] = useState<OneOffValue>({ date: '', startTime: '17:00', endTime: '18:00' });
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName('');
    setTeacherId('');
    setSkillLevel('BEGINNER');
    setCapacity('');
    setDescription('');
    setIsPrivate(false);
    setIsOneOff(false);
    setSlots([]);
    setOneOff({ date: '', startTime: '17:00', endTime: '18:00' });
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  const createMutation = useCreateClass({
    onSuccess: () => handleClose(),
    onError: (err) => setError(getErrorMessage(err, 'No se pudo crear la clase.')),
  });

  function handleSubmit() {
    setError(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('El nombre de la clase es requerido.');
      return;
    }
    if (!teacherId) {
      setError('Selecciona un profesor.');
      return;
    }

    let finalSlots: Slot[];
    if (isOneOff) {
      if (!oneOff.date) {
        setError('Elige la fecha de la clase única.');
        return;
      }
      if (oneOff.startTime >= oneOff.endTime) {
        setError('La hora de fin debe ser posterior a la de inicio.');
        return;
      }
      finalSlots = [
        { dayOfWeek: dowFromDate(oneOff.date), startTime: oneOff.startTime, endTime: oneOff.endTime },
      ];
    } else {
      if (slots.length === 0) {
        setError('Agrega al menos un día al horario.');
        return;
      }
      if (slots.some((s) => s.startTime >= s.endTime)) {
        setError('La hora de fin debe ser posterior a la de inicio.');
        return;
      }
      finalSlots = slots;
    }

    const capacityRaw = capacity.trim();
    createMutation.mutate({
      name: trimmedName,
      teacherId,
      slots: finalSlots,
      skillLevel,
      maxCapacity: capacityRaw ? parseInt(capacityRaw, 10) : undefined,
      description: description.trim() || undefined,
      isPrivate,
      oneOffDate: isOneOff ? oneOff.date : null,
    });
  }

  const teacherOptions = teachers.map((t) => ({
    value: t.id,
    label: `Prof. ${t.name || 'Sin nombre'}`,
  }));

  return (
    <Sheet visible={visible} onClose={handleClose} title="Nueva Clase">
      <Input
        label="Nombre de la clase"
        placeholder="Ej. Ballet, Jazz, K-Pop"
        value={name}
        onChangeText={setName}
      />

      <Select
        label="Profesor"
        placeholder="Seleccionar profesor"
        value={teacherId}
        onChange={setTeacherId}
        options={teacherOptions}
      />

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Select
            label="Nivel"
            value={skillLevel}
            onChange={setSkillLevel}
            options={LEVEL_OPTIONS}
          />
        </View>
        <View className="flex-1">
          <Input
            label="Capacidad"
            placeholder="0 = sin límite"
            value={capacity}
            onChangeText={setCapacity}
            keyboardType="numeric"
          />
        </View>
      </View>

      <View className="flex-row items-center justify-between rounded-xl border border-gray-100 p-3">
        <Text className="text-sm font-medium text-dark">Clase única (una sola fecha)</Text>
        <Switch value={isOneOff} onValueChange={setIsOneOff} />
      </View>

      {isOneOff ? (
        <OneOffScheduleEditor value={oneOff} onChange={setOneOff} />
      ) : (
        <ScheduleEditor value={slots} onChange={setSlots} />
      )}

      <Input
        label="Descripción (opcional)"
        placeholder="Descripción breve de la clase..."
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
        className="h-20 py-3"
        textAlignVertical="top"
      />

      <View className="flex-row items-start justify-between gap-3 rounded-xl border border-gray-100 p-3">
        <View className="flex-1">
          <Text className="text-sm font-medium text-dark">Clase privada</Text>
          <Text className="text-xs text-gray-400">
            Solo el admin inscribe alumnos. Oculta para quien no esté asignado.
          </Text>
        </View>
        <Switch value={isPrivate} onValueChange={setIsPrivate} />
      </View>

      {error && <Text className="text-sm text-danger">{error}</Text>}

      <Button
        label={createMutation.isPending ? 'Creando...' : 'Crear Clase'}
        className="w-full"
        loading={createMutation.isPending}
        onPress={handleSubmit}
      />
    </Sheet>
  );
}
