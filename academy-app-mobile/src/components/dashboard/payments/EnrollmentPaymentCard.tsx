import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { useEnrollmentStatus } from '@/lib/queries';
import { theme } from '@/theme';
import { formatPrice } from '@/utils/general';

import { EnrollmentUploadSheet } from './EnrollmentUploadSheet';

/**
 * Banner del alumno para pagar su matrícula anual. Se oculta si no tiene un
 * monto de matrícula configurado o si ya está al día (pago ACTIVE vigente).
 */
export function EnrollmentPaymentCard() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const { data: status, isLoading } = useEnrollmentStatus();

  if (isLoading || !status || !status.fee || status.fee <= 0) return null;

  if (status.active) {
    const expiry = status.expiresAt
      ? new Intl.DateTimeFormat('es-CR', { day: 'numeric', month: 'long', year: 'numeric' }).format(
          new Date(status.expiresAt)
        )
      : null;
    return (
      <View className="flex-row items-center gap-3 rounded-2xl border border-success/20 bg-success/5 px-4 py-3">
        <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
        <Text className="flex-1 text-sm font-medium text-success">
          Tu matrícula está al día{expiry ? ` — vence ${expiry}` : ''}.
        </Text>
      </View>
    );
  }

  if (status.pending) {
    return (
      <View className="flex-row items-center gap-3 rounded-2xl border border-warning/20 bg-warning/5 px-4 py-3">
        <Ionicons name="time" size={20} color={theme.colors.warning} />
        <Text className="flex-1 text-sm font-medium text-warning">
          Tu comprobante de matrícula está en revisión.
        </Text>
      </View>
    );
  }

  return (
    <>
      <View className="gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
        <View className="flex-row items-center gap-3">
          <Ionicons name="school" size={20} color={theme.colors.primary} />
          <View className="flex-1">
            <Text className="text-sm font-semibold text-dark">Matrícula pendiente</Text>
            <Text className="text-xs text-gray-500">{formatPrice(status.fee)} · pago anual</Text>
          </View>
        </View>
        <Button label="Pagar mi matrícula" onPress={() => setUploadOpen(true)} />
      </View>

      <EnrollmentUploadSheet
        visible={uploadOpen}
        onClose={() => setUploadOpen(false)}
        fee={status.fee}
      />
    </>
  );
}
