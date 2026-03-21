'use client';

import { useState, useTransition, useEffect } from 'react';
import { FileText, Check, X, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/cn';
import { approvePayment, rejectPayment } from '@/actions/payments';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { usePagination } from '@/hooks/usePagination';

type Plan = { id: string; name: string; price: number };
type Student = { id: string; name: string; email: string };
type Order = {
  id: string;
  status: string;
  createdAt: Date;
  receiptUrl: string | null;
  creditGranted: number | null;
  expiresAt: Date | null;
  student: Student;
  plan: Plan;
};

type PaymentsClientProps = {
  orders: Order[];
  pendingCount: number;
  monthCount: number;
  isAdmin?: boolean;
};

type TabKey = 'PENDING_REVIEW' | 'ACTIVE' | 'REJECTED' | 'ALL';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'PENDING_REVIEW', label: 'Pendientes' },
  { key: 'ACTIVE', label: 'Aprobados' },
  { key: 'REJECTED', label: 'Rechazados' },
  { key: 'ALL', label: 'Todos' },
];

function timeAgo(date: Date) {
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (mins < 60) return `Hace ${mins} minutos`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs} hora${hrs > 1 ? 's' : ''}`;
  return `Hace ${Math.floor(hrs / 24)} dias`;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

function ReceiptModal({
  url,
  student,
  plan,
  price,
  orderId,
  onClose,
}: {
  url: string;
  student: Student;
  plan: Plan;
  price: string;
  orderId: string;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="bg-dark flex items-center justify-between px-5 py-4">
          <h2 className="text-base font-bold text-white">
            Comprobante — {student.name}
          </h2>
          <Button variant="text" color="neutral" onClick={onClose} className="h-auto p-1 hover:bg-transparent border-transparent">
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
                {new Intl.DateTimeFormat('es-MX', {
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
                TOTAL ${price} MXN
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
                {plan.name} · ${price}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outlined"
              onClick={() =>
                startTransition(async () => {
                  await rejectPayment(orderId);
                  onClose();
                })
              }
              disabled={isPending}
              className="rounded-xl py-2 px-4"
            >
              Rechazar
            </Button>
            <Button
              variant="contained"
              onClick={() =>
                startTransition(async () => {
                  await approvePayment(orderId);
                  onClose();
                })
              }
              disabled={isPending}
              className="rounded-xl py-2 px-4"
            >
              Aprobar Pago
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentCard({ order, isAdmin = false }: { order: Order; isAdmin?: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState(order.status);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const approved = status === 'ACTIVE';
  const rejected = status === 'REJECTED';

  return (
    <>
      <div
        className={cn(
          'rounded-2xl border-2 bg-white p-5 shadow-sm transition-colors',
          approved ? 'border-success/30' : 'border-gray-50'
        )}
      >
        <div className="mb-3 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-dark flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
              <span className="text-sm font-bold text-white">
                {getInitials(order.student.name)}
              </span>
            </div>
            <div>
              <p className="text-dark text-sm font-semibold">
                {order.student.name}
              </p>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-medium',
                  order.plan.name.toLowerCase().includes('vip')
                    ? 'bg-primary text-white'
                    : order.plan.name.toLowerCase().includes('pro')
                      ? 'bg-dark text-white'
                      : 'bg-gray-100 text-gray-600'
                )}
              >
                {order.plan.name}
              </span>
            </div>
          </div>
          <span className="text-xs text-gray-400">
            {timeAgo(order.createdAt)}
          </span>
        </div>

        <p className="text-dark mb-3 text-sm">
          Plan mensual — ${String(order.plan.price)}
        </p>

        {/* Receipt thumbnail */}
        <div
          className="hover:border-primary/30 mb-2 flex h-24 cursor-pointer items-center justify-center rounded-xl border border-gray-100 bg-gray-50 transition-colors"
          onClick={() => setReceiptOpen(true)}
        >
          {order.receiptUrl ? (
            <Image
              src={order.receiptUrl}
              alt="Comprobante"
              className="h-full w-full rounded-xl object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-1 text-gray-300">
              <svg
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}
        </div>
        <Button
          variant="text"
          color="primary"
          onClick={() => setReceiptOpen(true)}
          className="h-auto p-0 mb-3 text-xs hover:bg-transparent hover:underline"
        >
          Ver comprobante completo
        </Button>

        {approved ? (
          <div className="bg-success/5 border-success/20 text-success flex items-center gap-2 rounded-xl border px-4 py-3 text-sm">
            <Check className="h-4 w-4" />
            <div>
              <p className="font-semibold">Aprobado — hace un momento</p>
              {order.creditGranted && order.expiresAt && (
                <p className="text-xs text-gray-500">
                  {order.creditGranted} creditos activados · Vence{' '}
                  {new Intl.DateTimeFormat('es-MX', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  }).format(new Date(order.expiresAt))}
                </p>
              )}
            </div>
          </div>
        ) : rejected ? (
          <div className="bg-danger/5 border-danger/20 text-danger rounded-xl border px-4 py-3 text-center text-sm font-semibold">
            Rechazado
          </div>
        ) : (
          isAdmin ? (
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="contained"
              color="success"
              onClick={() =>
                startTransition(async () => {
                  await approvePayment(order.id);
                  setStatus('ACTIVE');
                })
              }
              disabled={isPending}
              className="h-11 rounded-xl gap-1.5"
            >
              <Check className="h-4 w-4" /> Aprobar
            </Button>
            <Button
              variant="outlined"
              color="danger"
              onClick={() =>
                startTransition(async () => {
                  await rejectPayment(order.id);
                  setStatus('REJECTED');
                })
              }
              disabled={isPending}
              className="h-11 rounded-xl gap-1.5"
            >
              <X className="h-4 w-4" /> Rechazar
            </Button>
          </div>
          ) : (
          <div className="bg-warning/10 text-warning rounded-xl border border-warning/20 px-4 py-3 text-center text-sm font-semibold">
            Pendiente de revision
          </div>
          )
        )}
      </div>

      {receiptOpen && (
        <ReceiptModal
          url={order.receiptUrl ?? ''}
          student={order.student}
          plan={order.plan}
          price={String(order.plan.price)}
          orderId={order.id}
          onClose={() => setReceiptOpen(false)}
        />
      )}
    </>
  );
}

export function PaymentsClient({
  orders,
  pendingCount,
  monthCount,
  isAdmin = false,
}: PaymentsClientProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('PENDING_REVIEW');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filtered = orders.filter((o) =>
    activeTab === 'ALL' ? true : o.status === activeTab
  );

  const pagination = usePagination(filtered, { pageSize: 8 });

  // Reset to page 1 when tab changes
  useEffect(() => {
    pagination.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const tabCount = (key: TabKey) =>
    key === 'ALL'
      ? orders.length
      : orders.filter((o) => o.status === key).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 md:gap-3">
        <h1 className="text-dark text-2xl font-bold md:text-3xl">Pagos</h1>
        <span className="bg-danger/10 text-danger rounded-full px-3 py-1 text-sm font-semibold">
          {pendingCount} pendientes
        </span>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-600">
          {monthCount} este mes
        </span>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 overflow-x-auto border-b border-gray-200" style={{ WebkitOverflowScrolling: 'touch' }}>
        {TABS.map((tab) => {
          const count = tabCount(tab.key);
          return (
            <Button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              variant="text"
              color="neutral"
              className={cn(
                'h-auto rounded-none border-b-2 px-5 py-2.5 text-sm font-medium',
                activeTab === tab.key
                  ? 'border-primary text-primary hover:bg-transparent'
                  : 'border-transparent text-gray-400 hover:bg-transparent hover:text-dark'
              )}
            >
              {tab.label}
              {count > 0 && tab.key === 'PENDING_REVIEW' && (
                <span className="bg-primary flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white">
                  {count}
                </span>
              )}
            </Button>
          );
        })}
      </div>

      {/* Filters */}
      <div>
        {/* Mobile filter toggle */}
        <Button
          variant="text"
          color="neutral"
          onClick={() => setFiltersOpen((v) => !v)}
          className="h-9 px-3 text-sm border border-gray-200 hover:bg-gray-50 gap-1.5 md:hidden"
        >
          <SlidersHorizontal className="h-4 w-4" /> Filtros
        </Button>
        <div className={cn(
          'items-center gap-3 flex-wrap',
          filtersOpen ? 'flex mt-3' : 'hidden md:flex'
        )}>
          <Button variant="text" color="neutral" className="h-9 px-3 text-sm border border-gray-200 hover:bg-gray-50 gap-1.5">
            16 Feb — 16 Mar <ChevronDown className="h-3.5 w-3.5" />
          </Button>
          <Button variant="text" color="neutral" className="h-9 px-3 text-sm border border-gray-200 hover:bg-gray-50 gap-1.5">
            Todos los planes <ChevronDown className="h-3.5 w-3.5" />
          </Button>
          <Button variant="text" color="neutral" className="h-9 px-3 text-sm border border-gray-200 bg-gray-50 hover:bg-gray-100 gap-1.5">
            <FileText className="h-4 w-4" /> Exportar CSV
          </Button>
        </div>
      </div>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">
          Sin pagos en esta categoria
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
          {pagination.paginated.map((order) => (
            <PaymentCard key={order.id} order={order} isAdmin={isAdmin} />
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="rounded-xl bg-white shadow-sm">
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          pageSize={pagination.pageSize}
          hasNext={pagination.hasNext}
          hasPrev={pagination.hasPrev}
          onNext={pagination.next}
          onPrev={pagination.prev}
          onGoTo={pagination.goTo}
          label="pagos"
        />
      </div>
    </div>
  );
}
