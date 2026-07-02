import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Sheet } from '@/components/ui/Sheet';
import { Switch } from '@/components/ui/Switch';
import { getErrorMessage } from '@/lib/errorMessages';
import { useDeleteTeacher, useUpdateTeacher } from '@/lib/mutations';
import type { TeacherProfile } from '@/lib/interfaces/teachers';

type EditTeacherSheetProps = {
  teacher: TeacherProfile | null;
  onClose: () => void;
};

export function EditTeacherSheet({ teacher, onClose }: EditTeacherSheetProps) {
  return (
    <Sheet visible={!!teacher} onClose={onClose} title="Editar Profesor">
      {teacher && <EditTeacherForm key={teacher.id} teacher={teacher} onClose={onClose} />}
    </Sheet>
  );
}

function EditTeacherForm({
  teacher,
  onClose,
}: {
  teacher: TeacherProfile;
  onClose: () => void;
}) {
  const [name, setName] = useState(teacher.name ?? '');
  const [hourlyRateStr, setHourlyRateStr] = useState(
    teacher.hourlyRate != null ? String(teacher.hourlyRate) : '',
  );
  const [isActive, setIsActive] = useState(teacher.isActive);
  const [error, setError] = useState<string | null>(null);

  const updateMutation = useUpdateTeacher(teacher.id, {
    onSuccess: () => onClose(),
    onError: (err) => setError(getErrorMessage(err, 'Error al actualizar el profesor.')),
  });

  const deleteMutation = useDeleteTeacher(teacher.id, {
    onSuccess: () => onClose(),
    onError: (err) =>
      Alert.alert('Error', getErrorMessage(err, 'No se pudo eliminar el profesor.')),
  });

  function confirmDelete() {
    Alert.alert(
      'Eliminar profesor',
      `¿Eliminar a "${teacher.name ?? teacher.email}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => deleteMutation.mutate() },
      ],
    );
  }

  function handleSubmit() {
    setError(null);
    const trimmed = name.replace(/\s+/g, ' ').trim();
    if (!trimmed) {
      setError('El nombre es requerido.');
      return;
    }
    const rateRaw = hourlyRateStr.trim();
    const hourlyRate = rateRaw === '' ? null : Number(rateRaw);
    if (rateRaw !== '' && (Number.isNaN(hourlyRate) || (hourlyRate ?? 0) < 0)) {
      setError('El costo por hora debe ser un número positivo.');
      return;
    }
    updateMutation.mutate({ name: trimmed, hourlyRate, isActive });
  }

  return (
    <>
      <Input
        label="Nombre completo"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
      />
      <Input label="Email" value={teacher.email} editable={false} className="bg-gray-50" />
      <Input
        label="Costo por hora (opcional)"
        placeholder="Ej. 5000"
        value={hourlyRateStr}
        onChangeText={setHourlyRateStr}
        keyboardType="numeric"
      />

      <View className="flex-row items-center justify-between rounded-xl border border-gray-100 p-3">
        <Text className="text-sm font-medium text-dark">Profesor activo</Text>
        <Switch value={isActive} onValueChange={setIsActive} />
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
        label={deleteMutation.isPending ? 'Eliminando...' : 'Eliminar profesor'}
        className="w-full"
        loading={deleteMutation.isPending}
        onPress={confirmDelete}
      />
    </>
  );
}
