import { useState } from 'react';
import { useScrollLock } from '@/hooks/useScrollLock';
import { motion } from 'framer-motion';
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/interfaces/students';
import type { Student } from '@/lib/interfaces/students';
import { slideInRight } from '@/lib/animations';
import { X } from 'lucide-react';
import { getInitials } from '@/utils/general';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';

export function StudentDrawer({
  student,
  onClose,
}: {
  student: Student;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'info' | 'pagos' | 'asistencia' | 'progreso'>(
    'info'
  );

  const activeOrder = student.orders.find((o) => o.status === 'ACTIVE');

  useScrollLock(true);

  return (
    <motion.div
      className="fixed inset-x-0 bottom-0 z-40 m-0 flex max-h-[85vh] flex-col rounded-t-[20px] bg-white shadow-2xl md:inset-y-0 md:right-0 md:bottom-auto md:left-auto md:max-h-full md:min-h-screen md:w-96 md:rounded-none md:border-l md:border-gray-100"
      variants={slideInRight}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Mobile drag indicator */}
      <div className="flex justify-center pt-3 pb-1 md:hidden">
        <div className="h-1 w-10 rounded-full bg-gray-300" />
      </div>
      <div className="flex justify-end border-b border-gray-50 p-4">
        <Button
          variant="text"
          color="neutral"
          onClick={onClose}
          className="h-auto p-1"
        >
          <X className="hover:text-dark h-5 w-5 text-gray-400" />
        </Button>
      </div>

      {/* Avatar + info */}
      <div className="flex flex-col items-center gap-2 border-b border-gray-50 px-6 pt-4 pb-5">
        <div className="bg-primary flex h-16 w-16 items-center justify-center rounded-full">
          <span className="text-xl font-bold text-white">
            {getInitials(student.name)}
          </span>
        </div>
        <h3 className="text-dark text-lg font-bold">{student.name}</h3>
        <p className="text-sm text-gray-400">{student.email}</p>
        {activeOrder ? (
          <span className="bg-success/10 text-success rounded-full px-3 py-1 text-xs font-semibold">
            ACTIVO
          </span>
        ) : (
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-400">
            INACTIVO
          </span>
        )}
        <p className="text-xs text-gray-400">
          Miembro desde{' '}
          {new Intl.DateTimeFormat('es-CR', {
            month: 'long',
            year: 'numeric',
          }).format(student.createdAt)}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 px-4">
        {(['info', 'pagos', 'asistencia', 'progreso'] as const).map((t) => (
          <Button
            key={t}
            onClick={() => setTab(t)}
            variant="text"
            color="neutral"
            className={cn(
              'h-auto rounded-none border-b-2 px-3 py-2.5 text-sm font-medium capitalize',
              tab === t
                ? 'border-primary text-primary hover:bg-transparent'
                : 'hover:text-dark border-transparent text-gray-400 hover:bg-transparent'
            )}
          >
            {t === 'info'
              ? 'Informacion'
              : t.charAt(0).toUpperCase() + t.slice(1)}
          </Button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {tab === 'info' && (
          <>
            {activeOrder && (
              <div className="space-y-3 rounded-xl bg-gray-50 p-4">
                <h4 className="text-dark text-sm font-semibold">
                  Membresia activa
                </h4>
                <div className="flex items-center justify-between">
                  <span className="bg-dark rounded-full px-2.5 py-1 text-xs font-medium text-white">
                    {activeOrder.plan.name}
                  </span>
                  <span className="text-dark text-sm font-bold">—</span>
                </div>
                {activeOrder.creditGranted != null && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Creditos usados</span>
                    <span className="text-dark font-semibold">
                      {activeOrder.creditGranted}/{activeOrder.creditGranted}
                    </span>
                  </div>
                )}
                {activeOrder.expiresAt && (
                  <p className="text-danger text-xs">
                    Vence:{' '}
                    {new Intl.DateTimeFormat('es-CR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    }).format(new Date(activeOrder.expiresAt))}
                  </p>
                )}
                <Button
                  variant="text"
                  color="primary"
                  className="h-auto p-0 text-xs font-semibold hover:bg-transparent hover:underline"
                >
                  Renovar membresia
                </Button>
              </div>
            )}
            {student.familyMember && (
              <div className="space-y-2 rounded-xl bg-gray-50 p-4">
                <h4 className="text-dark text-sm font-semibold">
                  Cuenta familiar — {student.familyMember.family.name}
                </h4>
                <p className="text-success text-xs">
                  Descuento aplicado: -10% (2do hijo)
                </p>
              </div>
            )}
          </>
        )}
        {tab === 'pagos' && (
          <div className="space-y-3">
            {student.orders.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">
                Sin pagos registrados
              </p>
            ) : (
              student.orders.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between rounded-xl bg-gray-50 p-3"
                >
                  <div>
                    <p className="text-dark text-sm font-medium">
                      {o.plan.name}
                    </p>
                    {o.expiresAt && (
                      <p className="text-xs text-gray-400">
                        Vence{' '}
                        {new Intl.DateTimeFormat('es-CR', {
                          day: 'numeric',
                          month: 'short',
                        }).format(new Date(o.expiresAt))}
                      </p>
                    )}
                  </div>
                  <span
                    className={cn(
                      'rounded-full px-2 py-1 text-xs font-semibold',
                      STATUS_COLORS[o.status] ?? 'bg-gray-100 text-gray-500'
                    )}
                  >
                    {STATUS_LABELS[o.status] ?? o.status}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
        {tab === 'asistencia' && (
          <p className="py-12 text-center text-sm text-gray-400">
            Historial de asistencia disponible pronto
          </p>
        )}
        {tab === 'progreso' && (
          <p className="py-12 text-center text-sm text-gray-400">
            Progreso disponible pronto
          </p>
        )}
      </div>
    </motion.div>
  );
}
