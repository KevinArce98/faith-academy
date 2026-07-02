import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Sheet } from '@/components/ui/Sheet';
import { getErrorMessage } from '@/lib/errorMessages';
import { useApproveOrder, useRejectOrder } from '@/lib/mutations';
import type { Order } from '@/lib/interfaces/payments';

import { ReceiptViewer } from './ReceiptViewer';

type PaymentAdminActionsProps = {
  order: Order;
};

export function PaymentAdminActions({ order }: PaymentAdminActionsProps) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [viewerOpen, setViewerOpen] = useState(false);

  const approveMutation = useApproveOrder({
    onError: (err) => Alert.alert('Error', getErrorMessage(err, 'No se pudo aprobar la orden.')),
  });

  const rejectMutation = useRejectOrder({
    onSuccess: () => {
      setRejectOpen(false);
      setNotes('');
    },
    onError: (err) => Alert.alert('Error', getErrorMessage(err, 'No se pudo rechazar la orden.')),
  });

  function confirmApprove() {
    Alert.alert('Aprobar pago', `¿Aprobar el pago de ${order.plan.name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Aprobar', onPress: () => approveMutation.mutate(order.id) },
    ]);
  }

  const pending = order.status === 'PENDING_REVIEW';

  return (
    <View className="mt-3 gap-2 border-t border-gray-100 pt-3">
      {order.receiptUrl && (
        <Button
          variant="outlined"
          color="neutral"
          size="sm"
          label="Ver comprobante"
          onPress={() => setViewerOpen(true)}
        />
      )}

      {pending && (
        <View className="flex-row gap-2">
          <Button
            variant="outlined"
            color="danger"
            size="sm"
            label="Rechazar"
            className="flex-1"
            onPress={() => setRejectOpen(true)}
          />
          <Button
            color="success"
            size="sm"
            label="Aprobar"
            className="flex-1"
            loading={approveMutation.isPending}
            onPress={confirmApprove}
          />
        </View>
      )}

      <Sheet visible={rejectOpen} onClose={() => setRejectOpen(false)} title="Rechazar pago">
        <Text className="text-sm text-gray-500">
          Opcional: indica el motivo para que el alumno sepa qué corregir.
        </Text>
        <Input
          label="Motivo (opcional)"
          placeholder="Ej. El comprobante no es legible"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          className="h-20 py-3"
          textAlignVertical="top"
        />
        <Button
          color="danger"
          label={rejectMutation.isPending ? 'Rechazando...' : 'Rechazar pago'}
          className="w-full"
          loading={rejectMutation.isPending}
          onPress={() => rejectMutation.mutate({ orderId: order.id, notes: notes.trim() })}
        />
      </Sheet>

      <ReceiptViewer url={viewerOpen ? order.receiptUrl : null} onClose={() => setViewerOpen(false)} />
    </View>
  );
}
