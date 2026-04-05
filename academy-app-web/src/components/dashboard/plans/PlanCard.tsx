import { Pencil, Star, Calendar, Trash2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { useApiClient } from '@/lib/api';
import { INTERVAL_LABEL, getPlanColor } from '@/lib/interfaces/plans';
import type { Plan } from '@/lib/interfaces/plans';
import { formatPrice } from '@/utils/general';

interface PlanCardProps {
	plan: Plan;
	isPopular: boolean;
	onEdit?: (plan: Plan) => void;
	onDelete?: (plan: Plan) => void;
	onToggle?: (id: string, next: boolean) => void;
}

export function PlanCard({
	plan,
	isPopular,
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
				isPopular ? 'border-primary' : colors.border,
			)}
		>
			{/* Mas popular badge */}
			{isPopular && (
				<div className='absolute -top-3.5 left-1/2 -translate-x-1/2'>
					<span className='bg-primary rounded-full px-3 py-1 text-[10px] font-bold tracking-wider text-white uppercase'>
						Mas popular
					</span>
				</div>
			)}

			<div className='flex items-start justify-between'>
				<h2 className='text-dark text-lg font-bold'>{plan.name}</h2>

				{/* Toggle activo/inactivo */}
				{onToggle && (
					<button
						type='button'
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
				<span className='text-dark text-4xl font-bold'>{price}</span>
				<span className='text-sm text-gray-400'> /mes</span>
			</div>

			<div className='space-y-1.5 text-sm text-gray-600'>
				<div className='flex items-center gap-2'>
					<Star className='h-4 w-4 text-gray-300' />
					{plan.credits > 999
						? 'Créditos ilimitados'
						: `${plan.credits} créditos por mes`}
				</div>
				<div className='flex items-center gap-2'>
					<Calendar className='h-4 w-4 text-gray-300' />
					{INTERVAL_LABEL[plan.intervalType] ?? plan.intervalType}
				</div>
			</div>

			{plan.description && (
				<p className='text-sm leading-snug text-gray-400'>{plan.description}</p>
			)}

			<p className='text-dark text-sm font-semibold'>
				{plan._count.orders} alumnos activos
			</p>

			{(onEdit || onDelete) && (
				<div className='mt-auto flex gap-2'>
					{onEdit && (
						<Button
							variant='outlined'
							color='neutral'
							className='flex-1'
							onClick={() => onEdit(plan)}
						>
							<Pencil className='h-3.5 w-3.5' /> Editar
						</Button>
					)}
					{onDelete && (
						<Button
							color='danger'
							onClick={() => onDelete(plan)}
							aria-label='Eliminar plan'
						>
							<Trash2 className='h-3.5 w-3.5' />
						</Button>
					)}
				</div>
			)}
		</div>
	);
}
