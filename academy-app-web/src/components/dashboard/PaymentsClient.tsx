import { useState, useEffect, useRef } from 'react';
import { ChevronDown, SlidersHorizontal, Plus, X } from 'lucide-react';
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

type DateRangeKey = 'all' | 'today' | 'week' | 'month' | 'prev-month';

const DATE_RANGE_OPTIONS: { key: DateRangeKey; label: string }[] = [
  { key: 'all', label: 'Todo el tiempo' },
  { key: 'today', label: 'Hoy' },
  { key: 'week', label: 'Esta semana' },
  { key: 'month', label: 'Este mes' },
  { key: 'prev-month', label: 'Mes anterior' },
];

const TABS: { key: TabKey; label: string }[] = [
  { key: 'PENDING_REVIEW', label: 'Pendientes' },
  { key: 'ACTIVE', label: 'Aprobados' },
  { key: 'REJECTED', label: 'Rechazados' },
  { key: 'ALL', label: 'Todos' },
];

function matchesDateRange(createdAt: Date | string, range: DateRangeKey): boolean {
  if (range === 'all') return true;
  const date = new Date(createdAt);
  const now = new Date();
  if (range === 'today') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return date >= start;
  }
  if (range === 'week') {
    const start = new Date(now);
    start.setDate(now.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    return date >= start;
  }
  if (range === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return date >= start;
  }
  if (range === 'prev-month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 1);
    return date >= start && date < end;
  }
  return true;
}

type FilterDropdownProps = {
  label: string;
  active: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onClear?: () => void;
  children: React.ReactNode;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
};

function FilterDropdown({
  label,
  active,
  isOpen,
  onToggle,
  onClear,
  children,
  dropdownRef,
}: FilterDropdownProps) {
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors',
          active
            ? 'border-primary bg-primary/5 text-primary'
            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
        )}
      >
        {label}
        {active && onClear ? (
          <span
            role="button"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="hover:text-danger ml-0.5 flex items-center"
            aria-label="Limpiar filtro"
          >
            <X className="h-3 w-3" />
          </span>
        ) : (
          <ChevronDown
            className={cn('h-3.5 w-3.5 transition-transform', isOpen && 'rotate-180')}
          />
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 z-20 mt-1.5 min-w-44 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg">
          {children}
        </div>
      )}
    </div>
  );
}

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
  const [dateRange, setDateRange] = useState<DateRangeKey>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [dateDropOpen, setDateDropOpen] = useState(false);
  const [planDropOpen, setPlanDropOpen] = useState(false);

  const dateDropRef = useRef<HTMLDivElement>(null);
  const planDropRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    if (!dateDropOpen && !planDropOpen) return;
    function handler(e: MouseEvent) {
      if (dateDropOpen && dateDropRef.current && !dateDropRef.current.contains(e.target as Node)) {
        setDateDropOpen(false);
      }
      if (planDropOpen && planDropRef.current && !planDropRef.current.contains(e.target as Node)) {
        setPlanDropOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dateDropOpen, planDropOpen]);

  // Unique plans from loaded orders
  const uniquePlans = Array.from(
    new Map(orders.map((o) => [o.plan.id, o.plan])).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  const filtered = orders.filter((o) => {
    const matchTab = activeTab === 'ALL' ? true : o.status === activeTab;
    const matchDate = matchesDateRange(o.createdAt, dateRange);
    const matchPlan = planFilter === 'all' ? true : o.plan.id === planFilter;
    return matchTab && matchDate && matchPlan;
  });

  const pagination = usePagination(filtered, { pageSize: 8 });

  useEffect(() => {
    pagination.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, dateRange, planFilter]);

  const tabCount = (key: TabKey) =>
    key === 'ALL'
      ? orders.filter((o) => matchesDateRange(o.createdAt, dateRange) && (planFilter === 'all' || o.plan.id === planFilter)).length
      : orders.filter((o) => o.status === key && matchesDateRange(o.createdAt, dateRange) && (planFilter === 'all' || o.plan.id === planFilter)).length;

  const selectedDateLabel =
    DATE_RANGE_OPTIONS.find((o) => o.key === dateRange)?.label ?? 'Fecha';
  const selectedPlanLabel =
    planFilter === 'all'
      ? 'Todos los planes'
      : (uniquePlans.find((p) => p.id === planFilter)?.name ?? 'Plan');

  const hasActiveFilters = dateRange !== 'all' || planFilter !== 'all';

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
          {/* Mobile toggle */}
          <div className="flex items-center gap-2 md:hidden">
            <Button
              variant="text"
              color="neutral"
              onClick={() => setFiltersOpen((v) => !v)}
              className={cn(
                'h-9 gap-1.5 border px-3 text-sm hover:bg-gray-50',
                hasActiveFilters ? 'border-primary text-primary bg-primary/5' : 'border-gray-200'
              )}
            >
              <SlidersHorizontal className="h-4 w-4" /> Filtros
              {hasActiveFilters && (
                <span className="bg-primary flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white">
                  {(dateRange !== 'all' ? 1 : 0) + (planFilter !== 'all' ? 1 : 0)}
                </span>
              )}
            </Button>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => { setDateRange('all'); setPlanFilter('all'); }}
                className="text-xs text-gray-400 hover:text-gray-600 underline"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Filters row */}
          <div className={cn('items-center gap-3', filtersOpen ? 'mt-3 flex flex-wrap' : 'hidden md:flex')}>
            {/* Date range dropdown */}
            <FilterDropdown
              label={selectedDateLabel}
              active={dateRange !== 'all'}
              isOpen={dateDropOpen}
              onToggle={() => { setDateDropOpen((v) => !v); setPlanDropOpen(false); }}
              onClear={() => setDateRange('all')}
              dropdownRef={dateDropRef}
            >
              {DATE_RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => { setDateRange(opt.key); setDateDropOpen(false); }}
                  className={cn(
                    'flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors hover:bg-gray-50',
                    dateRange === opt.key ? 'text-primary font-semibold' : 'text-gray-700'
                  )}
                >
                  {opt.label}
                  {dateRange === opt.key && (
                    <span className="bg-primary h-1.5 w-1.5 rounded-full" />
                  )}
                </button>
              ))}
            </FilterDropdown>

            {/* Plan dropdown */}
            <FilterDropdown
              label={selectedPlanLabel}
              active={planFilter !== 'all'}
              isOpen={planDropOpen}
              onToggle={() => { setPlanDropOpen((v) => !v); setDateDropOpen(false); }}
              onClear={() => setPlanFilter('all')}
              dropdownRef={planDropRef}
            >
              <button
                type="button"
                onClick={() => { setPlanFilter('all'); setPlanDropOpen(false); }}
                className={cn(
                  'flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors hover:bg-gray-50',
                  planFilter === 'all' ? 'text-primary font-semibold' : 'text-gray-700'
                )}
              >
                Todos los planes
                {planFilter === 'all' && <span className="bg-primary h-1.5 w-1.5 rounded-full" />}
              </button>
              {uniquePlans.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => { setPlanFilter(plan.id); setPlanDropOpen(false); }}
                  className={cn(
                    'flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors hover:bg-gray-50',
                    planFilter === plan.id ? 'text-primary font-semibold' : 'text-gray-700'
                  )}
                >
                  {plan.name}
                  {planFilter === plan.id && (
                    <span className="bg-primary h-1.5 w-1.5 rounded-full" />
                  )}
                </button>
              ))}
            </FilterDropdown>

            {/* Clear all (desktop) */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => { setDateRange('all'); setPlanFilter('all'); }}
                className="text-xs text-gray-400 hover:text-gray-600 underline"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>
      )}

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">
          {hasActiveFilters
            ? 'Sin pagos con los filtros aplicados.'
            : 'Sin pagos en esta categoría.'}
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
