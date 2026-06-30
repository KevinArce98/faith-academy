import { useMutation } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { modalVariants, overlayVariants } from '@/lib/animations';
import { useApiClient } from '@/lib/api';
import { getErrorMessage } from '@/lib/errorMessages';
import type { Plan } from '@/lib/interfaces/plans';

interface DeletePlanConfirmProps {
	plan: Plan;
	onClose: () => void;
	onSuccess: (planId: string) => void;
	onError: (message: string) => void;
}

export function DeletePlanConfirm({
	plan,
	onClose,
	onSuccess,
	onError,
}: DeletePlanConfirmProps) {
	const apiClient = useApiClient();

	const deleteMutation = useMutation({
		mutationFn: async () => {
			const result = await apiClient<{ error?: string }>(
				`/api/v1/plans/${plan.id}`,
				{ method: 'DELETE' },
			);
			if (result?.error) throw { error: result.error };
			return plan.id;
		},
		onSuccess: (planId) => {
			onSuccess(planId);
		},
		onError: (err: any) => {
			onError(err.error ?? getErrorMessage(err, 'Error al eliminar el plan'));
			onClose();
		},
	});

	return (
		<AnimatePresence>
			<motion.div
				className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center md:p-4"
				onClick={onClose}
				variants={overlayVariants}
				initial="hidden"
				animate="visible"
				exit="exit"
			>
				<motion.div
					className="w-full rounded-t-3xl bg-white shadow-2xl md:max-w-sm md:rounded-2xl"
					variants={modalVariants}
					initial="hidden"
					animate="visible"
					exit="exit"
					onClick={(e) => e.stopPropagation()}
				>
					<div className="flex justify-center pt-3 pb-1 md:hidden">
						<div className="h-1 w-10 rounded-full bg-gray-300" />
					</div>
					{/* Header */}
					<div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
						<div className="flex items-center gap-2">
							<AlertTriangle className="text-danger h-5 w-5" />
							<h2 className="text-dark text-lg font-bold">Eliminar plan</h2>
						</div>
						<Button
							variant="icon"
							color="neutral"
							onClick={onClose}
							className="h-auto p-1"
						>
							<X className="h-5 w-5 text-gray-400" />
						</Button>
					</div>

					{/* Body */}
					<div className="space-y-2 px-6 py-5">
						<p className="text-sm text-gray-600">
							¿Estás seguro de que deseas eliminar el plan{' '}
							<span className="text-dark font-semibold">{plan.name}</span>?
						</p>
						{plan._count.subscriptions > 0 && (
							<p className="bg-warning/10 text-warning rounded-lg px-3 py-2 text-xs font-medium">
								Este plan tiene {plan._count.subscriptions} alumno
								{plan._count.subscriptions !== 1 ? 's' : ''} activo
								{plan._count.subscriptions !== 1 ? 's' : ''} y no puede eliminarse.
							</p>
						)}
						{plan._count.subscriptions === 0 && (
							<p className="bg-danger/10 text-danger rounded-lg px-3 py-2 text-xs">
								Esta acción no se puede deshacer.
							</p>
						)}
					</div>

					{/* Actions */}
					<div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
						<Button
							type="button"
							color="neutral"
							variant="text"
							onClick={onClose}
							disabled={deleteMutation.isPending}
							className="rounded-xl"
						>
							Cancelar
						</Button>
						<Button
							type="button"
							color="danger"
							onClick={() => deleteMutation.mutate()}
							disabled={deleteMutation.isPending || plan._count.subscriptions > 0}
							className="rounded-xl px-6"
						>
							{deleteMutation.isPending ? 'Eliminando…' : 'Eliminar'}
						</Button>
					</div>
				</motion.div>
			</motion.div>
		</AnimatePresence>
	);
}
