import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock, GraduationCap } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { useEnrollmentStatus } from '@/lib/queries';
import { qk } from '@/lib/queryKeys';
import { formatPrice } from '@/utils/general';

import { EnrollmentUploadModal } from './EnrollmentUploadModal';

/**
 * Banner del alumno para pagar su matrícula anual. Se oculta si no tiene un
 * monto de matrícula configurado o si ya está al día (pago ACTIVE vigente).
 */
export function EnrollmentPaymentCard() {
  const queryClient = useQueryClient();
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
      <div className="bg-success/5 border-success/20 flex items-center gap-3 rounded-2xl border px-5 py-4">
        <CheckCircle2 className="text-success h-5 w-5 shrink-0" />
        <p className="text-success text-sm font-medium">
          Tu matrícula está al día{expiry ? ` — vence ${expiry}` : ''}.
        </p>
      </div>
    );
  }

  if (status.pending) {
    return (
      <div className="bg-warning/5 border-warning/20 flex items-center gap-3 rounded-2xl border px-5 py-4">
        <Clock className="text-warning h-5 w-5 shrink-0" />
        <p className="text-warning text-sm font-medium">
          Tu comprobante de matrícula está en revisión.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="border-primary/20 bg-primary/5 flex flex-col gap-3 rounded-2xl border px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <GraduationCap className="text-primary h-5 w-5 shrink-0" />
          <div>
            <p className="text-dark text-sm font-semibold">Matrícula pendiente</p>
            <p className="text-xs text-gray-500">{formatPrice(status.fee)} · pago anual</p>
          </div>
        </div>
        <Button
          variant="contained"
          color="primary"
          className="h-10 shrink-0 gap-1.5 rounded-xl px-4"
          onClick={() => setUploadOpen(true)}
        >
          Pagar mi matrícula
        </Button>
      </div>

      <EnrollmentUploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        fee={status.fee}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: qk.payments });
          queryClient.invalidateQueries({ queryKey: qk.enrollmentStatus() });
        }}
      />
    </>
  );
}
