import { Plus, Search } from 'lucide-react';
import { useState } from 'react';

import { DeletePlanConfirm } from '@/components/dashboard/plans/DeletePlanConfirm';
import { PlanCard } from '@/components/dashboard/plans/PlanCard';
import { PlanModal } from '@/components/dashboard/plans/PlanModal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { cn } from '@/lib/cn';
import type { Plan, PlansClientProps } from '@/lib/interfaces/plans';

type StatusFilter = 'all' | 'active' | 'inactive';

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
	{ key: 'all', label: 'Todos' },
	{ key: 'active', label: 'Activos' },
	{ key: 'inactive', label: 'Inactivos' },
];

export function PlansClient({ plans, isAdmin = false }: PlansClientProps) {
	const [planList, setPlanList] = useState<Plan[]>(plans);
	const [search, setSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState<StatusFilter>(
		isAdmin ? 'all' : 'active',
	);
	const [modalPlan, setModalPlan] = useState<Plan | null | undefined>(
		undefined,
	);
	const [deletingPlan, setDeletingPlan] = useState<Plan | null>(null);
	const [toastError, setToastError] = useState<string | null>(null);

	const filtered = planList.filter((p) => {
		const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
		const matchStatus =
			statusFilter === 'all'
				? true
				: statusFilter === 'active'
					? p.isActive
					: !p.isActive;
		return matchSearch && matchStatus;
	});

	const popular = planList.length
		? planList.reduce((a, b) => (a._count.orders > b._count.orders ? a : b))
		: null;

	const pagination = usePagination(filtered, { pageSize: 12 });

	function handleToggle(id: string, next: boolean) {
		setPlanList((prev) =>
			prev.map((p) => (p.id === id ? { ...p, isActive: next } : p)),
		);
	}

	function handleModalSuccess(updated: Plan, isNew: boolean) {
		setPlanList((prev) =>
			isNew
				? [...prev, updated]
				: prev.map((p) => (p.id === updated.id ? updated : p)),
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
				<h1 className="text-dark text-2xl font-bold md:text-3xl">
					Planes de Membresía
				</h1>
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

			{/* Filters */}
			<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				{/* Search */}
				<div className="w-full md:w-64">
					<Input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Buscar plan..."
						startIcon={<Search className="h-4 w-4" />}
						className="h-9"
					/>
				</div>

				{/* Status tabs — admin only */}
				{isAdmin && (
					<div className="flex items-center gap-0 rounded-xl border border-gray-200 bg-gray-50 p-1">
						{STATUS_TABS.map((tab) => {
							const count =
								tab.key === 'all'
									? planList.length
									: tab.key === 'active'
										? planList.filter((p) => p.isActive).length
										: planList.filter((p) => !p.isActive).length;
							return (
								<button
									key={tab.key}
									type="button"
									onClick={() => setStatusFilter(tab.key)}
									className={cn(
										'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
										statusFilter === tab.key
											? 'bg-white text-dark shadow-sm'
											: 'text-gray-400 hover:text-gray-600',
									)}
								>
									{tab.label}
									<span
										className={cn(
											'rounded-full px-1.5 py-0.5 text-[11px] font-bold leading-none',
											statusFilter === tab.key
												? 'bg-primary/10 text-primary'
												: 'bg-gray-200 text-gray-400',
										)}
									>
										{count}
									</span>
								</button>
							);
						})}
					</div>
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
			{filtered.length === 0 ? (
				<div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-white px-8 py-16 text-center shadow-sm">
					<p className="text-dark text-lg font-bold">
						{search
							? `Sin resultados para "${search}"`
							: 'Sin planes en esta categoría'}
					</p>
					{search && (
						<button
							type="button"
							onClick={() => setSearch('')}
							className="text-primary text-sm hover:underline"
						>
							Limpiar búsqueda
						</button>
					)}
					{isAdmin && !search && (
						<Button
							color="primary"
							className="mt-1 rounded-xl px-4"
							onClick={() => setModalPlan(null)}
						>
							+ Crear Plan
						</Button>
					)}
				</div>
			) : (
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
			)}

			{/* Pagination */}
			{filtered.length > 0 && (
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
			)}

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
