import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { StudentPaymentHistory } from '@/components/dashboard/students/StudentPaymentHistory';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Sheet } from '@/components/ui/Sheet';
import { getErrorMessage } from '@/lib/errorMessages';
import { currentSubscription, type Student } from '@/lib/interfaces/students';
import { useMarkEnrollmentPaid, useUpdateStudent } from '@/lib/mutations';
import { useEnrollmentStatusFor, usePlans } from '@/lib/queries';
import { cn } from '@/utils/cn';

type EditStudentSheetProps = {
  student: Student | null;
  onClose: () => void;
};

export function EditStudentSheet({ student, onClose }: EditStudentSheetProps) {
  return (
    <Sheet visible={!!student} onClose={onClose} title="Editar Alumno">
      {student && <EditStudentForm key={student.id} student={student} onClose={onClose} />}
    </Sheet>
  );
}

function EditStudentForm({ student, onClose }: { student: Student; onClose: () => void }) {
  const router = useRouter();
  const sub = currentSubscription(student);

  const [name, setName] = useState(student.name ?? '');
  const [email, setEmail] = useState(student.email ?? '');
  const [phone, setPhone] = useState(student.phone ?? '');
  const [planId, setPlanId] = useState(sub?.plan.id ?? '');
  const [enrollmentFee, setEnrollmentFee] = useState(
    student.enrollmentFee != null ? String(student.enrollmentFee) : '',
  );
  const [enrolledAt, setEnrolledAt] = useState(student.enrolledAt?.slice(0, 10) ?? '');
  const [error, setError] = useState<string | null>(null);
  const [enrollmentError, setEnrollmentError] = useState<string | null>(null);

  const { data: plansData } = usePlans();
  const plans = (plansData ?? []).filter((p) => p.isActive);

  const { data: enrollmentStatus } = useEnrollmentStatusFor(student.id);

  const markPaidMutation = useMarkEnrollmentPaid({
    onSuccess: () => setEnrollmentError(null),
    onError: (err) => setEnrollmentError(getErrorMessage(err, 'No se pudo marcar la matrícula.')),
  });

  const updateMutation = useUpdateStudent(student.id, {
    onSuccess: () => onClose(),
    onError: (err) => setError(getErrorMessage(err, 'Error al actualizar el alumno.')),
  });

  function handleSubmit() {
    setError(null);
    const trimmedName = name.replace(/\s+/g, ' ').trim();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedName || !trimmedEmail) {
      setError('Nombre y email son requeridos.');
      return;
    }
    const feeRaw = enrollmentFee.trim();
    const fee = feeRaw === '' ? undefined : Number(feeRaw);
    if (feeRaw !== '' && (Number.isNaN(fee) || (fee ?? 0) < 0)) {
      setError('La matrícula debe ser un número positivo.');
      return;
    }
    updateMutation.mutate({
      name: trimmedName,
      email: trimmedEmail,
      phone: phone.trim() || undefined,
      planId: planId || '',
      enrollmentFee: fee,
      enrolledAt: enrolledAt || undefined,
    });
  }

  return (
    <>
      <Input label="Nombre completo" value={name} onChangeText={setName} autoCapitalize="words" />
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
          />
        </View>
        <View className="flex-1">
          <Input
            label="Teléfono"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>
      </View>

      <Select
        label="Plan de membresía"
        placeholder="Seleccionar plan"
        value={planId}
        onChange={setPlanId}
        options={plans.map((p) => ({ value: p.id, label: p.name }))}
      />

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Input
            label="Matrícula"
            placeholder="0.00"
            value={enrollmentFee}
            onChangeText={setEnrollmentFee}
            keyboardType="numeric"
          />
        </View>
        <View className="flex-1">
          <DatePicker label="Fecha matrícula" value={enrolledAt} onChange={setEnrolledAt} />
        </View>
      </View>

      {enrollmentStatus && (
        <View className="flex-row items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5">
          <Text className="text-sm text-gray-500">Estado de matrícula</Text>
          <Text
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-semibold',
              enrollmentStatus.active
                ? 'bg-success/10 text-success'
                : enrollmentStatus.pending
                  ? 'bg-warning/10 text-warning'
                  : 'bg-gray-200 text-gray-500',
            )}
          >
            {enrollmentStatus.active
              ? 'Al día'
              : enrollmentStatus.pending
                ? 'En revisión'
                : 'Pendiente'}
          </Text>
        </View>
      )}
      {enrollmentError && <Text className="text-sm text-danger">{enrollmentError}</Text>}
      {enrollmentStatus &&
        !enrollmentStatus.active &&
        !enrollmentStatus.pending &&
        student.enrollmentFee != null &&
        student.enrollmentFee > 0 && (
          <Button
            variant="outlined"
            label={markPaidMutation.isPending ? 'Guardando...' : 'Marcar matrícula pagada'}
            className="w-full"
            loading={markPaidMutation.isPending}
            onPress={() => markPaidMutation.mutate(student.id)}
          />
        )}

      {error && <Text className="text-sm text-danger">{error}</Text>}

      <Button
        label={updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
        className="w-full"
        loading={updateMutation.isPending}
        onPress={handleSubmit}
      />

      <Button
        variant="outlined"
        color="neutral"
        label="Ver historial completo"
        className="w-full"
        onPress={() => {
          onClose();
          router.push({
            pathname: '/(app)/student-history',
            params: { id: student.id, name: student.name ?? '' },
          });
        }}
      />

      <View className="border-t border-gray-100 pt-4">
        <StudentPaymentHistory studentId={student.id} />
      </View>
    </>
  );
}
