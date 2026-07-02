import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Sheet } from '@/components/ui/Sheet';
import { Switch } from '@/components/ui/Switch';
import { getErrorMessage } from '@/lib/errorMessages';
import { useDeleteClass, useUpdateClass } from '@/lib/mutations';

import { OneOffScheduleEditor, type OneOffValue } from './OneOffScheduleEditor';
import { ScheduleEditor } from './ScheduleEditor';
import { dowFromDate, LEVEL_OPTIONS, type Slot } from './classes.types';

export type EditableClass = {
  id: string;
  name: string;
  teacherId: string;
  skillLevel: string;
  slots?: Slot[];
  maxCapacity?: number;
  description?: string | null;
  isPrivate?: boolean;
  oneOffDate?: string | null;
};

export type AssignableTeacher = { id: string; name: string | null };

type EditClassSheetProps = {
  cls: EditableClass | null;
  teachers: AssignableTeacher[];
  onClose: () => void;
};

export function EditClassSheet({ cls, teachers, onClose }: EditClassSheetProps) {
  return (
    <Sheet visible={!!cls} onClose={onClose} title="Editar Clase">
      {cls && (
        <EditClassForm key={cls.id} cls={cls} teachers={teachers} onClose={onClose} />
      )}
    </Sheet>
  );
}

function EditClassForm({
  cls,
  teachers,
  onClose,
}: {
  cls: EditableClass;
  teachers: AssignableTeacher[];
  onClose: () => void;
}) {
  const [name, setName] = useState(cls.name);
  const [teacherId, setTeacherId] = useState(cls.teacherId);
  const [skillLevel, setSkillLevel] = useState(cls.skillLevel);
  const [capacity, setCapacity] = useState(cls.maxCapacity ? String(cls.maxCapacity) : '');
  const [description, setDescription] = useState(cls.description ?? '');
  const [isPrivate, setIsPrivate] = useState(cls.isPrivate ?? false);
  const [isOneOff, setIsOneOff] = useState(!!cls.oneOffDate);
  const [slots, setSlots] = useState<Slot[]>(cls.slots ?? []);
  const [oneOff, setOneOff] = useState<OneOffValue>({
    date: cls.oneOffDate?.slice(0, 10) ?? '',
    startTime: cls.slots?.[0]?.startTime ?? '17:00',
    endTime: cls.slots?.[0]?.endTime ?? '18:00',
  });
  const [error, setError] = useState<string | null>(null);

  const updateMutation = useUpdateClass(cls.id, {
    onSuccess: () => onClose(),
    onError: (err) => setError(getErrorMessage(err, 'No se pudo actualizar la clase.')),
  });

  const deleteMutation = useDeleteClass(cls.id, {
    onSuccess: () => onClose(),
    onError: (err) =>
      Alert.alert('Error', getErrorMessage(err, 'No se pudo eliminar la clase.')),
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
    updateMutation.mutate({
      name: trimmedName,
      teacherId,
      slots: finalSlots,
      skillLevel,
      maxCapacity: capacityRaw ? parseInt(capacityRaw, 10) : 0,
      description: description.trim() || '',
      isPrivate,
      oneOffDate: isOneOff ? oneOff.date : null,
    });
  }

  function confirmDelete() {
    Alert.alert('Eliminar clase', `¿Eliminar "${cls.name}"? Esta acción no se puede deshacer.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteMutation.mutate() },
    ]);
  }

  const teacherOptions = teachers.map((t) => ({
    value: t.id,
    label: `Prof. ${t.name || 'Sin nombre'}`,
  }));

  return (
    <>
      <Input label="Nombre de la clase" value={name} onChangeText={setName} />

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
        label={updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
        className="w-full"
        loading={updateMutation.isPending}
        onPress={handleSubmit}
      />

      <Button
        variant="outlined"
        color="danger"
        label={deleteMutation.isPending ? 'Eliminando...' : 'Eliminar clase'}
        className="w-full"
        loading={deleteMutation.isPending}
        onPress={confirmDelete}
      />
    </>
  );
}
