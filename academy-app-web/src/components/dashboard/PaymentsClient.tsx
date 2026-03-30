import { useState, useEffect } from 'react';
import { FileText, ChevronDown, SlidersHorizontal, Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { usePagination } from '@/hooks/usePagination';
import {
  UploadPaymentModal,
  type PlanOption,
} from '@/components/dashboard/payments/UploadPaymentModal';
import { PaymentCard } from '@/components/dashboard/payments/PaymentCard';
import type { Order, TabKey } from '@/components/dashboard/payments/payments.types';

type PaymentsClientProps = {
  orders: Order[];
  pendingCount: number;
  monthCount: number;
  isAdmin?: boolean;
  plans?: PlanOption[];
};

const TABS: { key: TabKey; label: string }[] = [
  { key: 'PENDING_REVIEW', label: 'Pendientes' },
  { key: 'ACTIVE', label: 'Aprobados' },
  { key: 'REJECTED', label: 'Rechazados' },
  { key: 'ALL', label: 'Todos' },
];

export function PaymentsClient({
  orders,
  pendingCount,
  monthCount,
  isAdmin = false,
  plans = [],
}: PaymentsClientProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>('PENDING_REVIEW');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const filtered = orders.filter((o) =>
    activeTab === 'ALL' ? true : o.status === activeTab
  );

  const pagination = usePagination(filtered, { pageSize: 8 });

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
        <h1 className="text-dark text-2xl font-bold md:text-3xl">
          {isAdmin ? 'Pagos' : 'Mis Pagos'}
        </h1>
        <span className="bg-danger/10 text-danger rounded-full px-3 py-1 text-sm font-semibold">
          {pendingCount} pendientes
        </span>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-600">
          {monthCount} este mes
        </span>
        {!isAdmin && (
          <Button
            variant="contained"
            color="primary"
            className="ml-auto h-9 gap-1.5 rounded-xl px-4"
            onClick={() => setUploadOpen(true)}
          >
            <Plus className="h-4 w-4" /> Subir pago
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div
        className="flex items-center gap-0 overflow-x-auto border-b border-gray-200"
        style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
      >
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
                  : 'hover:text-dark border-transparent text-gray-400 hover:bg-transparent'
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

      {/* Filters (admin only) */}
      {isAdmin && (
        <div>
          <Button
            variant="text"
            color="neutral"
            onClick={() => setFiltersOpen((v) => !v)}
            className="h-9 gap-1.5 border border-gray-200 px-3 text-sm hover:bg-gray-50 md:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" /> Filtros
          </Button>
          <div
            className={cn(
              'flex-wrap items-center gap-3',
              filtersOpen ? 'mt-3 flex' : 'hidden md:flex'
            )}
          >
            <Button
              variant="text"
              color="neutral"
              className="h-9 gap-1.5 border border-gray-200 px-3 text-sm hover:bg-gray-50"
            >
              16 Feb — 16 Mar <ChevronDown className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="text"
              color="neutral"
              className="h-9 gap-1.5 border border-gray-200 px-3 text-sm hover:bg-gray-50"
            >
              Todos los planes <ChevronDown className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="text"
              color="neutral"
              className="h-9 gap-1.5 border border-gray-200 bg-gray-50 px-3 text-sm hover:bg-gray-100"
            >
              <FileText className="h-4 w-4" /> Exportar CSV
            </Button>
          </div>
        </div>
      )}

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

      {/* Student upload modal */}
      {!isAdmin && (
        <UploadPaymentModal
          isOpen={uploadOpen}
          onClose={() => setUploadOpen(false)}
          plans={plans}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['payments'] })}
        />
      )}
    </div>
  );
}
