import { useTransition } from 'react';
import { X } from 'lucide-react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { modalVariants, overlayVariants } from '@/lib/animations';
import { Button } from '@/components/ui/Button';
import { formatPrice, getInitials } from '@/utils/general';
import type { Plan, Student } from './payments.types';

type ReceiptModalProps = {
  url: string;
  student: Student;
  plan: Plan;
  price: number | string;
  status: string;
  onClose: () => void;
  onApprove?: () => Promise<void>;
  onReject?: () => Promise<void>;
  isAdmin?: boolean;
};

export function ReceiptModal({
  url,
  student,
  plan,
  price,
  status,
  onClose,
  onApprove,
  onReject,
  isAdmin = false,
}: ReceiptModalProps) {
  const [isPending, startTransition] = useTransition();
  const canReview = isAdmin && status === 'PENDING_REVIEW';

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      variants={overlayVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <motion.div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <div className="bg-dark flex items-center justify-between px-5 py-4">
          <h2 className="text-base font-bold text-white">
            Comprobante — {student.name}
          </h2>
          <Button
            variant="text"
            color="neutral"
            onClick={onClose}
            className="h-auto border-transparent p-1 hover:bg-transparent"
          >
            <X className="h-5 w-5 text-white/60 hover:text-white" />
          </Button>
        </div>
        <div className="flex min-h-48 items-center justify-center bg-gray-50 p-6">
          {url.startsWith('http') ? (
            <Image
              src={url}
              alt="Comprobante"
              className="max-h-64 rounded-lg shadow"
              width={256}
              height={256}
            />
          ) : (
            <div className="w-64 space-y-2 rounded-xl bg-white p-6 text-center shadow-md">
              <p className="text-dark text-xs font-bold tracking-widest uppercase">
                Comprobante de Pago
              </p>
              <p className="text-xs text-gray-400">
                {new Intl.DateTimeFormat('es-CR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                }).format(new Date())}
              </p>
              <div className="mt-3 space-y-1 border-t border-gray-100 pt-3 text-left text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Concepto</span>
                  <span className="text-dark font-medium">{plan.name}</span>
                </div>
              </div>
              <p className="text-primary pt-2 text-lg font-bold">
                TOTAL {formatPrice(price)}
              </p>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-gray-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
              <span className="text-xs font-bold text-white">
                {getInitials(student.name)}
              </span>
            </div>
            <div>
              <p className="text-dark text-sm font-semibold">{student.name}</p>
              <p className="text-xs text-gray-400">
                {plan.name} · {formatPrice(price)}
              </p>
            </div>
          </div>
          {canReview && (
            <div className="flex gap-2">
              <Button
                variant="outlined"
                onClick={() =>
                  startTransition(async () => {
                    if (!onReject) return;
                    await onReject();
                    onClose();
                  })
                }
                disabled={isPending}
                className="rounded-xl px-4 py-2"
              >
                Rechazar
              </Button>
              <Button
                variant="contained"
                onClick={() =>
                  startTransition(async () => {
                    if (!onApprove) return;
                    await onApprove();
                    onClose();
                  })
                }
                disabled={isPending}
                className="rounded-xl px-4 py-2"
              >
                Aprobar Pago
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
