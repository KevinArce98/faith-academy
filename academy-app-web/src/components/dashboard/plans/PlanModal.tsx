import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { useScrollLock } from '@/hooks/useScrollLock';
import { modalVariants, overlayVariants } from '@/lib/animations';
import { useApiClient } from '@/lib/api';
import { getErrorMessage } from '@/lib/errorMessages';
import type { Plan, PlanFormValues } from '@/lib/interfaces/plans';
import { planFormSchema } from '@/lib/validations/plans';

interface PlanModalProps {
	plan?: Plan | null;
	onClose: () => void;
	onSuccess: (plan: Plan, isNew: boolean) => void;
}

export function PlanModal({ plan, onClose, onSuccess }: PlanModalProps) {
	const isEditing = !!plan;
	const apiClient = useApiClient();
	const queryClient = useQueryClient();

	useScrollLock(true);

	const {
		register,
		handleSubmit,
		watch,
		setValue,
		formState: { errors: fieldErrors },
	} = useForm<PlanFormValues>({
		resolver: zodResolver(planFormSchema),
		defaultValues: plan
			? {
					name: plan.name,
					description: plan.description ?? '',
					price: String(plan.price),
					classesPerWeek: String(plan.classesPerWeek),
					unlimited: plan.classesPerWeek === 0,
					isPublic: plan.isPublic,
					isSingleClass: plan.isSingleClass,
				}
			: {
					name: '',
					description: '',
					price: '',
					classesPerWeek: '1',
					unlimited: false,
					isPublic: true,
					isSingleClass: false,
				},
	});

	const unlimited = watch('unlimited');

	// Al marcar ilimitadas, limpia el campo de clases/semana (muestra "Ilimitadas").
	useEffect(() => {
		if (unlimited) setValue('classesPerWeek', '');
	}, [unlimited, setValue]);

	const [error, setError] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	function onSubmit(form: PlanFormValues) {
		setError(null);

		startTransition(async () => {
			try {
				const payload = {
					name: form.name.trim(),
					description: form.description.trim() || null,
					price: parseFloat(form.price),
					classesPerWeek: form.unlimited
						? 0
						: parseInt(form.classesPerWeek || '0', 10),
					isPublic: form.isPublic,
					isSingleClass: form.isSingleClass,
				};

				let result: { plan: Plan };

				if (isEditing) {
					result = await apiClient<{ plan: Plan }>(`/api/v1/plans/${plan.id}`, {
						method: 'PUT',
						body: JSON.stringify(payload),
					});
				} else {
					result = await apiClient<{ plan: Plan }>('/api/v1/plans', {
						method: 'POST',
						body: JSON.stringify(payload),
					});
				}

				await queryClient.invalidateQueries({ queryKey: ['plans'] });

				// Build updated plan with _count for optimistic UI
				const updated: Plan = {
					...result.plan,
					_count: plan?._count ?? { subscriptions: 0 },
				};

				onSuccess(updated, !isEditing);
			} catch (err) {
				setError(getErrorMessage(err, 'Error al guardar el plan'));
			}
		});
	}

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
					className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl md:max-w-lg md:rounded-2xl"
					variants={modalVariants}
					initial="hidden"
					animate="visible"
					exit="exit"
					onClick={(e) => e.stopPropagation()}
				>
					<div className="flex-1 overflow-y-auto">
						<div className="flex justify-center pt-3 pb-1 md:hidden">
							<div className="h-1 w-10 rounded-full bg-gray-300" />
						</div>
						{/* Header */}
						<div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
							<h2 className="text-dark text-lg font-bold">
								{isEditing ? 'Editar Plan' : 'Nuevo Plan'}
							</h2>
							<Button variant="icon" onClick={onClose} className="h-auto p-1">
								<X className="h-5 w-5 text-gray-400" />
							</Button>
						</div>

						{/* Form */}
						<form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6">
							<Input
								label="Nombre del plan"
								placeholder="Ej. Plan Pro, VIP Anual"
								error={fieldErrors.name?.message}
								{...register('name')}
							/>

							<div className="grid grid-cols-2 gap-4">
								<Input
									type="number"
									min="0"
									step="0.01"
									label="Precio"
									placeholder="0.00"
									endAdornment="CRC"
									error={fieldErrors.price?.message}
									{...register('price')}
								/>
								<Input
									type="number"
									min="0"
									label="Clases por semana"
									placeholder={unlimited ? 'Ilimitadas' : 'Ej. 2'}
									hint={
										unlimited
											? 'Sin límite de clases'
											: 'Cuántas clases/semana incluye'
									}
									disabled={unlimited}
									error={fieldErrors.classesPerWeek?.message}
									{...register('classesPerWeek')}
								/>
							</div>

							<div className="space-y-3 rounded-xl bg-gray-50 p-4">
								<label className="flex cursor-pointer items-start gap-3">
									<Checkbox className="mt-0.5" {...register('unlimited')} />
									<span className="text-sm">
										<span className="text-dark font-semibold">
											Clases ilimitadas (indefinidas)
										</span>
										<span className="block text-xs text-gray-500">
											El alumno puede asistir a todas las clases que quiera
										</span>
									</span>
								</label>
								<label className="flex cursor-pointer items-start gap-3">
									<Checkbox className="mt-0.5" {...register('isPublic')} />
									<span className="text-sm">
										<span className="text-dark font-semibold">
											Visible para alumnos
										</span>
										<span className="block text-xs text-gray-500">
											Desmárcalo para un plan oculto tipo beca (solo lo asigna
											el admin)
										</span>
									</span>
								</label>
								<label className="flex cursor-pointer items-start gap-3">
									<Checkbox className="mt-0.5" {...register('isSingleClass')} />
									<span className="text-sm">
										<span className="text-dark font-semibold">
											Plan de una sola clase
										</span>
										<span className="block text-xs text-gray-500">
											Para alumnos que toman una única clase
										</span>
									</span>
								</label>
							</div>

							<Textarea
								label="Descripción (opcional)"
								placeholder="Beneficios o detalles adicionales del plan"
								error={fieldErrors.description?.message}
								rows={3}
								{...register('description')}
							/>

							{error && (
								<p className="bg-danger/10 text-danger rounded-lg px-4 py-2 text-sm">
									{error}
								</p>
							)}

							<div className="flex justify-end gap-3 pt-2">
								<Button
									type="button"
									variant="text"
									color="neutral"
									onClick={onClose}
									disabled={isPending}
									className="rounded-xl"
								>
									Cancelar
								</Button>
								<Button
									type="submit"
									variant="contained"
									color="primary"
									disabled={isPending}
									className="rounded-xl px-6"
								>
									{isPending
										? isEditing
											? 'Guardando…'
											: 'Creando…'
										: isEditing
											? 'Guardar cambios'
											: 'Crear plan'}
								</Button>
							</div>
						</form>
					</div>
				</motion.div>
			</motion.div>
		</AnimatePresence>
	);
}
