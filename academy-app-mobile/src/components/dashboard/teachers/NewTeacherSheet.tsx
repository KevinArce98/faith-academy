import { useState } from 'react';
import { Text } from 'react-native';

import { TempPasswordResult } from '@/components/dashboard/TempPasswordResult';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Sheet } from '@/components/ui/Sheet';
import { getErrorMessage } from '@/lib/errorMessages';
import { useCreateTeacher } from '@/lib/mutations';

type CreateResult = { tempPassword: string };

const initialForm = { name: '', email: '', hourlyRate: '' };

function normalizeName(name: string) {
  return name.replace(/\s+/g, ' ').trim();
}

type NewTeacherSheetProps = {
  visible: boolean;
  onClose: () => void;
};

export function NewTeacherSheet({ visible, onClose }: NewTeacherSheetProps) {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateResult | null>(null);

  function resetAndClose() {
    setForm(initialForm);
    setError(null);
    setResult(null);
    onClose();
  }

  const createMutation = useCreateTeacher({
    onSuccess: (res) => setResult({ tempPassword: res.tempPassword }),
    onError: (err) => setError(getErrorMessage(err, 'Error al crear el profesor.')),
  });

  function handleSubmit() {
    setError(null);
    const name = normalizeName(form.name);
    const email = form.email.trim().toLowerCase();
    if (!name || !email) {
      setError('Nombre y email son requeridos.');
      return;
    }
    const rateRaw = form.hourlyRate.trim();
    const hourlyRate = rateRaw === '' ? undefined : Number(rateRaw);
    if (rateRaw !== '' && (Number.isNaN(hourlyRate) || (hourlyRate ?? 0) < 0)) {
      setError('El costo por hora debe ser un número positivo.');
      return;
    }
    createMutation.mutate({ name, email, hourlyRate });
  }

  const canSubmit = normalizeName(form.name).length > 0 && form.email.trim().length > 0;

  if (result) {
    return (
      <Sheet visible={visible} onClose={resetAndClose} bare>
        <TempPasswordResult
          title="Profesor creado"
          subtitle="Comparte la contraseña temporal para que pueda iniciar sesión."
          tempPassword={result.tempPassword}
          onClose={resetAndClose}
        />
      </Sheet>
    );
  }

  return (
    <Sheet visible={visible} onClose={resetAndClose} title="Nuevo Profesor">
      <Text className="text-sm text-gray-400">
        Crea una cuenta y genera una contraseña temporal.
      </Text>

      <Input
        label="Nombre completo"
        placeholder="Ej. Ana Valverde"
        value={form.name}
        onChangeText={(name) => setForm((p) => ({ ...p, name }))}
        autoCapitalize="words"
      />
      <Input
        label="Email"
        placeholder="correo@ejemplo.com"
        value={form.email}
        onChangeText={(email) => setForm((p) => ({ ...p, email }))}
        autoCapitalize="none"
        keyboardType="email-address"
        autoCorrect={false}
      />
      <Input
        label="Costo por hora (opcional)"
        placeholder="Ej. 5000"
        value={form.hourlyRate}
        onChangeText={(hourlyRate) => setForm((p) => ({ ...p, hourlyRate }))}
        keyboardType="numeric"
      />

      {error && <Text className="text-sm text-danger">{error}</Text>}

      <Button
        label={createMutation.isPending ? 'Creando...' : 'Crear Profesor'}
        className="w-full"
        disabled={!canSubmit}
        loading={createMutation.isPending}
        onPress={handleSubmit}
      />
    </Sheet>
  );
}
