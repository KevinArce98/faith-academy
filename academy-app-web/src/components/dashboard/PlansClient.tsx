import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { PlanCard } from '@/components/dashboard/plans/PlanCard';
import { PlanModal } from '@/components/dashboard/plans/PlanModal';
import { DeletePlanConfirm } from '@/components/dashboard/plans/DeletePlanConfirm';
import type { Plan, PlansClientProps } from '@/lib/interfaces/plans';

export function PlansClient({ plans, isAdmin = false }: PlansClientProps) {
  const [planList, setPlanList] = useState<Plan[]>(plans);
  const [modalPlan, setModalPlan] = useState<Plan | null | undefined>(
    undefined
  ); // undefined = closed
  const [deletingPlan, setDeletingPlan] = useState<Plan | null>(null);
  const [toastError, setToastError] = useState<string | null>(null);

  const pagination = usePagination(planList, { pageSize: 12 });

  const popular = planList.length
    ? planList.reduce((a, b) => (a._count.orders > b._count.orders ? a : b))
    : null;

  function handleToggle(id: string, next: boolean) {
    setPlanList((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isActive: next } : p))
    );
  }

  function handleModalSuccess(updated: Plan, isNew: boolean) {
    setPlanList((prev) =>
      isNew
        ? [...prev, updated]
        : prev.map((p) => (p.id === updated.id ? updated : p))
    );
    setModalPlan(undefined);
  }

  function handleDeleteSuccess(planId: string) {
    setPlanList((prev) => prev.filter((p) => p.id !== planId));
    setDeletingPlan(null);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-dark text-2xl font-bold md:text-3xl">Planes de Membresía</h1>
        {isAdmin && (
          <Button
            color="primary"
            className="rounded-xl px-4"
            onClick={() => setModalPlan(null)}
          >
            + Nuevo Plan
          </Button>
        )}
      </div>

      {toastError && (
        <div className="bg-danger/10 text-danger flex items-center justify-between gap-4 rounded-xl px-4 py-3 text-sm">
          <span>{toastError}</span>
          <button
            onClick={() => setToastError(null)}
            className="text-danger/60 hover:text-danger shrink-0"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
      )}

      {/* Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-3 xl:grid-cols-4">
        {pagination.paginated.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isPopular={popular?.id === plan.id}
            onEdit={isAdmin ? (p) => setModalPlan(p) : undefined}
            onDelete={isAdmin ? (p) => setDeletingPlan(p) : undefined}
            onToggle={isAdmin ? handleToggle : undefined}
          />
        ))}

        {isAdmin && planList.length === 0 && (
          <Button
            variant="text"
            color="neutral"
            onClick={() => setModalPlan(null)}
            className="hover:border-primary hover:text-primary h-64 w-64 flex-col rounded-2xl border-2 border-dashed border-gray-200 text-gray-400"
          >
            <Plus className="h-8 w-8" />
            <span className="text-sm font-medium">Nuevo Plan</span>
          </Button>
        )}
      </div>

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
          label="planes"
        />
      </div>

      {modalPlan !== undefined && (
        <PlanModal
          plan={modalPlan}
          onClose={() => setModalPlan(undefined)}
          onSuccess={handleModalSuccess}
        />
      )}

      {deletingPlan && (
        <DeletePlanConfirm
          plan={deletingPlan}
          onClose={() => setDeletingPlan(null)}
          onSuccess={handleDeleteSuccess}
          onError={(msg) => setToastError(msg)}
        />
      )}
    </div>
  );
}
