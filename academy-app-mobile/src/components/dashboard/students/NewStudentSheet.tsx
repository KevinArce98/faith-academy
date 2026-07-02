import { useState } from 'react';
import { Text, View } from 'react-native';

import { TempPasswordResult } from '@/components/dashboard/TempPasswordResult';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Sheet } from '@/components/ui/Sheet';
import { getErrorMessage } from '@/lib/errorMessages';
import { useCreateStudent } from '@/lib/mutations';
import { usePlans } from '@/lib/queries';

type CreateResult = { tempPassword: string };

const initialForm = {
  name: '',
  email: '',
  phone: '',
  planId: '',
  enrollmentFee: '',
  enrolledAt: '',
};

type NewStudentSheetProps = {
  visible: boolean;
  onClose: () => void;
};

export function NewStudentSheet({ visible, onClose }: NewStudentSheetProps) {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateResult | null>(null);

  const { data: plansData } = usePlans(visible);
  const plans = (plansData ?? []).filter((p) => p.isActive);

  function resetAndClose() {
    setForm(initialForm);
    setError(null);
    setResult(null);
    onClose();
  }

  const createMutation = useCreateStudent({
    onSuccess: (res) => setResult({ tempPassword: res.tempPassword }),
    onError: (err) => setError(getErrorMessage(err, 'Error al crear el alumno.')),
  });

  function handleSubmit() {
    setError(null);
    const name = form.name.replace(/\s+/g, ' ').trim();
    const email = form.email.trim().toLowerCase();
    if (!name || !email) {
      setError('Nombre y email son requeridos.');
      return;
    }
    const feeRaw = form.enrollmentFee.trim();
    const enrollmentFee = feeRaw === '' ? undefined : Number(feeRaw);
    if (feeRaw !== '' && (Number.isNaN(enrollmentFee) || (enrollmentFee ?? 0) < 0)) {
      setError('La matrícula debe ser un número positivo.');
      return;
    }
    createMutation.mutate({
      name,
      email,
      phone: form.phone.trim() || undefined,
      planId: form.planId || undefined,
      enrollmentFee,
      enrolledAt: form.enrolledAt || undefined,
    });
  }

  const canSubmit = form.name.trim().length > 0 && form.email.trim().length > 0;

  if (result) {
    return (
      <Sheet visible={visible} onClose={resetAndClose} bare>
        <TempPasswordResult
          title="Alumno creado"
          subtitle="Ya puede iniciar sesión con la contraseña temporal."
          tempPassword={result.tempPassword}
          onClose={resetAndClose}
        />
      </Sheet>
    );
  }

  return (
    <Sheet visible={visible} onClose={resetAndClose} title="Nuevo Alumno">
      <Input
        label="Nombre completo"
        placeholder="Ej. María García"
        value={form.name}
        onChangeText={(name) => setForm((p) => ({ ...p, name }))}
        autoCapitalize="words"
      />
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Input
            label="Email"
            placeholder="correo@ejemplo.com"
            value={form.email}
            onChangeText={(email) => setForm((p) => ({ ...p, email }))}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
          />
        </View>
        <View className="flex-1">
          <Input
            label="Teléfono"
            placeholder="+506 0000 0000"
            value={form.phone}
            onChangeText={(phone) => setForm((p) => ({ ...p, phone }))}
            keyboardType="phone-pad"
          />
        </View>
      </View>

      <Select
        label="Plan de membresía (opcional)"
        placeholder="Seleccionar plan"
        value={form.planId}
        onChange={(planId) => setForm((p) => ({ ...p, planId }))}
        options={plans.map((p) => ({ value: p.id, label: p.name }))}
      />

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Input
            label="Matrícula (opcional)"
            placeholder="0.00"
            value={form.enrollmentFee}
            onChangeText={(enrollmentFee) => setForm((p) => ({ ...p, enrollmentFee }))}
            keyboardType="numeric"
          />
        </View>
        <View className="flex-1">
          <DatePicker
            label="Fecha matrícula"
            value={form.enrolledAt}
            onChange={(enrolledAt) => setForm((p) => ({ ...p, enrolledAt }))}
          />
        </View>
      </View>

      {error && <Text className="text-sm text-danger">{error}</Text>}

      <Button
        label={createMutation.isPending ? 'Creando...' : 'Crear Alumno'}
        className="w-full"
        disabled={!canSubmit}
        loading={createMutation.isPending}
        onPress={handleSubmit}
      />
    </Sheet>
  );
}
