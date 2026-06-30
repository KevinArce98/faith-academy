import { Pencil, Star, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { useApiClient } from '@/lib/api';
import { cn } from '@/lib/cn';
import { getPlanColor } from '@/lib/interfaces/plans';
import type { Plan } from '@/lib/interfaces/plans';
import { formatPrice } from '@/utils/general';

interface PlanCardProps {
	plan: Plan;
	isAdmin?: boolean;
	onEdit?: (plan: Plan) => void;
	onDelete?: (plan: Plan) => void;
	onToggle?: (id: string, next: boolean) => void;
}

export function PlanCard({
	plan,
	isAdmin = false,
	onEdit,
	onDelete,
	onToggle,
}: PlanCardProps) {
	const apiClient = useApiClient();
	const colors = getPlanColor(plan.name);
	const price = formatPrice(plan.price);

	async function handleToggle() {
		onToggle?.(plan.id, !plan.isActive);
		await apiClient(`/api/v1/plans/${plan.id}/toggle`, {
			method: 'PATCH',
			body: JSON.stringify({ isActive: !plan.isActive }),
		});
	}

	return (
		<div
			className={cn(
				'relative flex w-full flex-col gap-4 rounded-2xl border-2 bg-white p-4 shadow-sm md:p-6',
				colors.border,
			)}
		>
			<div className="flex items-start justify-between">
				<div className="flex flex-col gap-1">
					<h2 className="text-dark text-lg font-bold">{plan.name}</h2>
					{!plan.isPublic && (
						<span className="w-fit rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold tracking-wide text-amber-700 uppercase">
							Beca · oculto
						</span>
					)}
				</div>

				{/* Toggle activo/inactivo */}
				{onToggle && (
					<button
						type="button"
						onClick={handleToggle}
						aria-label={plan.isActive ? 'Desactivar plan' : 'Activar plan'}
						className={cn(
							'relative h-6 w-11 shrink-0 cursor-pointer rounded-full p-0 transition-colors duration-200',
							'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
							plan.isActive ? 'bg-primary' : 'bg-gray-200',
						)}
					>
						<span
							className={cn(
								'absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200',
								plan.isActive ? 'translate-x-1' : '-translate-x-5',
							)}
						/>
					</button>
				)}
			</div>

			<div>
				<span className="text-dark text-4xl font-bold">{price}</span>
				<span className="text-sm text-gray-400"> /mes</span>
			</div>

			<div className="space-y-1.5 text-sm text-gray-600">
				<div className="flex items-center gap-2">
					<Star className="h-4 w-4 text-gray-300" />
					{plan.isSingleClass
						? 'Una sola clase'
						: plan.classesPerWeek === 0
							? 'Clases ilimitadas'
							: `${plan.classesPerWeek} ${plan.classesPerWeek === 1 ? 'clase' : 'clases'} por semana`}
				</div>
			</div>

			{plan.description && (
				<p className="text-sm leading-snug text-gray-400">{plan.description}</p>
			)}

			{isAdmin && (
				<p className="text-dark text-sm font-semibold">
					{plan._count.subscriptions} alumno
					{plan._count.subscriptions !== 1 ? 's' : ''} activo
					{plan._count.subscriptions !== 1 ? 's' : ''} este mes
				</p>
			)}

			{(onEdit || onDelete) && (
				<div className="mt-auto flex gap-2">
					{onEdit && (
						<Button
							variant="outlined"
							color="neutral"
							className="flex-1"
							onClick={() => onEdit(plan)}
						>
							<Pencil className="h-3.5 w-3.5" /> Editar
						</Button>
					)}
					{onDelete && (
						<Button
							color="danger"
							onClick={() => onDelete(plan)}
							aria-label="Eliminar plan"
						>
							<Trash2 className="h-3.5 w-3.5" />
						</Button>
					)}
				</div>
			)}
		</div>
	);
}
