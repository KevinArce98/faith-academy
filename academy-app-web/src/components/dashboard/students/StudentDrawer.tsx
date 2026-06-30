import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { useScrollLock } from '@/hooks/useScrollLock';
import { slideInRight } from '@/lib/animations';
import { cn } from '@/lib/cn';
import { type Student, currentSubscription } from '@/lib/interfaces/students';
import { formatPrice, getInitials } from '@/utils/general';

const monthLabel = (iso: string) =>
  new Intl.DateTimeFormat('es-CR', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));

export function StudentDrawer({ student, onClose }: { student: Student; onClose: () => void }) {
  const [tab, setTab] = useState<'info' | 'pagos' | 'asistencia' | 'progreso'>('info');

  const sub = currentSubscription(student);

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
        <Button variant="text" color="neutral" onClick={onClose} className="h-auto p-1">
          <X className="hover:text-dark h-5 w-5 text-gray-400" />
        </Button>
      </div>

      {/* Avatar + info */}
      <div className="flex flex-col items-center gap-2 border-b border-gray-50 px-6 pt-4 pb-5">
        <div className="bg-primary flex h-16 w-16 items-center justify-center rounded-full">
          <span className="text-xl font-bold text-white">{getInitials(student.name)}</span>
        </div>
        <h3 className="text-dark text-lg font-bold">{student.name}</h3>
        <p className="text-sm text-gray-400">{student.email}</p>
        {student.isActive ? (
          <span className="bg-success/10 text-success rounded-full px-3 py-1 text-xs font-semibold">
            ACTIVO
          </span>
        ) : (
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-400">
            INACTIVO
          </span>
        )}
        <p className="text-xs text-gray-400">Miembro desde {monthLabel(student.createdAt)}</p>
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
            {t === 'info' ? 'Informacion' : t.charAt(0).toUpperCase() + t.slice(1)}
          </Button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {tab === 'info' && (
          <>
            <div className="space-y-3 rounded-xl bg-gray-50 p-4">
              <h4 className="text-dark text-sm font-semibold">Mensualidad del mes</h4>
              {sub ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="bg-dark rounded-full px-2.5 py-1 text-xs font-medium text-white">
                      {sub.plan.name}
                    </span>
                    <span className="text-dark text-sm font-bold">{formatPrice(sub.amount)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Estado del pago</span>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-semibold',
                        sub.isPaid ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                      )}
                    >
                      {sub.isPaid ? 'Pagado' : 'Pendiente'}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-400">Sin plan asignado</p>
              )}
            </div>

            <div className="space-y-2 rounded-xl bg-gray-50 p-4">
              <h4 className="text-dark text-sm font-semibold">Matrícula</h4>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Monto</span>
                <span className="text-dark font-semibold">
                  {student.enrollmentFee != null ? formatPrice(student.enrollmentFee) : '—'}
                </span>
              </div>
              {student.enrolledAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Fecha</span>
                  <span className="text-dark">
                    {new Intl.DateTimeFormat('es-CR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    }).format(new Date(student.enrolledAt))}
                  </span>
                </div>
              )}
            </div>
          </>
        )}
        {tab === 'pagos' && (
          <div className="space-y-3">
            {student.subscriptions.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">Sin pagos registrados</p>
            ) : (
              student.subscriptions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-xl bg-gray-50 p-3"
                >
                  <div>
                    <p className="text-dark text-sm font-medium">{s.plan.name}</p>
                    <p className="text-xs text-gray-400 capitalize">
                      {monthLabel(s.period)} · {formatPrice(s.amount)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'rounded-full px-2 py-1 text-xs font-semibold',
                      s.isPaid ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                    )}
                  >
                    {s.isPaid ? 'Pagado' : 'Pendiente'}
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
          <p className="py-12 text-center text-sm text-gray-400">Progreso disponible pronto</p>
        )}
      </div>
    </motion.div>
  );
}
