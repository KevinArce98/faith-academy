import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Check, CircleCheckBig, Copy, X } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useScrollLock } from '@/hooks/useScrollLock';
import { modalVariants, overlayVariants } from '@/lib/animations';
import { useApiClient } from '@/lib/api';
import { getErrorMessage } from '@/lib/errorMessages';
import type { Plan } from '@/lib/interfaces/students';
import {
	type CreateStudentInput,
	createStudentSchema,
} from '@/lib/validations/students';

export function NewStudentModal({
	plans,
	onClose,
}: {
	plans: Plan[];
	onClose: () => void;
}) {
	const queryClient = useQueryClient();
	const apiClient = useApiClient();
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [tempPassword, setTempPassword] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);

	useScrollLock(true);

	const {
		register,
		handleSubmit,
		formState: { errors: fieldErrors },
	} = useForm<CreateStudentInput>({
		resolver: zodResolver(createStudentSchema),
		defaultValues: {
			name: '',
			email: '',
			phone: '',
			planId: '',
			notes: '',
		},
	});

	async function onSubmit(form: CreateStudentInput) {
		setError(null);
		setSubmitting(true);

		try {
			const data = await apiClient<{ tempPassword: string }>(
				'/api/v1/students',
				{
					method: 'POST',
					body: JSON.stringify({
						...form,
						planId: form.planId || null,
					}),
				},
			);

			queryClient.invalidateQueries({ queryKey: ['students'] });
			setTempPassword(data.tempPassword);
		} catch (err) {
			setError(getErrorMessage(err, 'Error al crear el alumno.'));
		} finally {
			setSubmitting(false);
		}
	}

	function handleCopy() {
		if (!tempPassword) return;
		navigator.clipboard.writeText(tempPassword);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}

	return (
		<motion.div
			className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center md:p-4"
			onClick={onClose}
			variants={overlayVariants}
			initial="hidden"
			animate="visible"
			exit="exit"
		>
			<motion.div
				className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl md:max-w-lg md:rounded-2xl"
				variants={modalVariants}
				initial="hidden"
				animate="visible"
				exit="exit"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Drag indicator - mobile only */}
				<div className="flex justify-center pt-3 pb-1 md:hidden">
					<div className="h-1 w-10 rounded-full bg-gray-300" />
				</div>
				{/* ── Success screen ── */}
				{tempPassword ? (
					<div className="flex flex-col items-center p-8">
						<div className="bg-success/10 mb-4 flex h-16 w-16 items-center justify-center rounded-full">
							<CircleCheckBig className="text-success h-8 w-8" />
						</div>
						<h2 className="text-dark text-lg font-bold">
							Alumno creado exitosamente
						</h2>
						<p className="mt-1 text-sm text-gray-400">
							El alumno ya puede iniciar sesion
						</p>

						<div className="mt-6 w-full rounded-xl border border-amber-200 bg-amber-50 p-4">
							<p className="text-sm font-medium text-amber-800">
								Contrasena temporal &mdash; compartir con el alumno
							</p>
							<div className="mt-2 flex items-center gap-2">
								<code className="text-dark flex-1 rounded-lg border border-amber-200 bg-white px-4 py-2.5 text-center font-mono text-base font-semibold tracking-wide">
									{tempPassword}
								</code>
								<Button
									type="button"
									variant="text"
									color="neutral"
									onClick={handleCopy}
									className="h-10 w-10 shrink-0 rounded-lg border border-amber-200 bg-white p-0 hover:bg-amber-100"
									aria-label="Copiar contrasena"
								>
									{copied ? (
										<Check className="text-success h-4 w-4" />
									) : (
										<Copy className="h-4 w-4 text-amber-700" />
									)}
								</Button>
							</div>
							<p className="mt-2 text-xs text-amber-600">
								El alumno debe cambiar su contrasena al iniciar sesion por
								primera vez
							</p>
						</div>

						<Button
							type="button"
							variant="contained"
							className="mt-6 h-11 w-full rounded-xl"
							onClick={onClose}
						>
							Cerrar
						</Button>
					</div>
				) : (
					/* ── Form screen ── */
					<>
						<div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
							<h2 className="text-dark text-lg font-bold">Nuevo Alumno</h2>
							<Button
								variant="text"
								color="neutral"
								onClick={onClose}
								className="h-auto p-1"
							>
								<X className="h-5 w-5 text-gray-400" />
							</Button>
						</div>
						<form className="space-y-5 p-6" onSubmit={handleSubmit(onSubmit)}>
							<Input
								label="Nombre completo"
								placeholder="Ej. Maria Garcia"
								error={fieldErrors.name?.message}
								{...register('name')}
							/>
							<div className="grid grid-cols-2 gap-4">
								<Input
									type="email"
									label="Email"
									placeholder="correo@ejemplo.com"
									error={fieldErrors.email?.message}
									{...register('email')}
								/>
								<Input
									label="Telefono"
									placeholder="+506 0000 0000"
									error={fieldErrors.phone?.message}
									{...register('phone')}
								/>
							</div>
							<Select
								label="Plan de membresia"
								error={fieldErrors.planId?.message}
								{...register('planId')}
							>
								<option value="">Seleccionar plan</option>
								{plans.map((p) => (
									<option key={p.id} value={p.id}>
										{p.name}
									</option>
								))}
							</Select>
							<div>
								<label className="text-dark mb-2 block text-sm font-medium">
									Cuenta familiar
								</label>
								<div className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3">
									<div className="relative h-6 w-10 cursor-pointer rounded-full bg-gray-200">
										<div className="absolute top-1 left-1 h-4 w-4 rounded-full bg-white shadow transition-transform" />
									</div>
									<span className="text-sm text-gray-500">
										Vincular a familia existente
									</span>
								</div>
							</div>
							<Textarea
								label="Notas internas"
								placeholder="Observaciones, preferencias, etc."
								rows={3}
								error={fieldErrors.notes?.message}
								{...register('notes')}
							/>
							{error ? <p className="text-danger text-sm">{error}</p> : null}
							<div className="flex gap-3 pt-2">
								<Button
									type="button"
									variant="text"
									color="neutral"
									onClick={onClose}
									className="h-11 flex-1 rounded-xl border border-gray-200 hover:bg-gray-50"
									disabled={submitting}
								>
									Cancelar
								</Button>
								<Button
									type="submit"
									variant="contained"
									className="h-11 flex-1 rounded-xl"
									disabled={submitting}
								>
									{submitting ? 'Creando...' : 'Crear Alumno'}
								</Button>
							</div>
						</form>
					</>
				)}
			</motion.div>
		</motion.div>
	);
}
