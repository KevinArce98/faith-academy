import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, CircleCheckBig, Copy } from 'lucide-react';
import { type SubmitEvent, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ResponsiveModal } from '@/components/ui/ResponsiveModal';
import { useApiClient } from '@/lib/api';
import { getErrorMessage } from '@/lib/errorMessages';

function normalizeName(name: string) {
	return name.replace(/\s+/g, ' ').trim();
}

function normalizeEmail(email: string) {
	return email.trim().toLowerCase();
}

type NewTeacherModalProps = {
	isOpen: boolean;
	onClose: () => void;
	onCreated?: (message: string) => void;
};

export function NewTeacherModal({
	isOpen,
	onClose,
	onCreated,
}: NewTeacherModalProps) {
	const apiClient = useApiClient();
	const queryClient = useQueryClient();
	const initialForm = { name: '', email: '', hourlyRate: '' };
	const [form, setForm] = useState(initialForm);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<{ tempPassword: string } | null>(null);
	const [copied, setCopied] = useState(false);

	function resetState() {
		setForm(initialForm);
		setError(null);
		setResult(null);
		setCopied(false);
	}

	function handleClose() {
		resetState();
		onClose();
	}

	const createMutation = useMutation({
		mutationFn: async ({ name, email, hourlyRate }: { name: string; email: string; hourlyRate?: number }) => {
			return await apiClient<{ tempPassword: string }>(
				'/api/v1/teachers',
				{
					method: 'POST',
					body: JSON.stringify({ name, email, hourlyRate }),
				},
			);
		},
		onSuccess: (res) => {
			setResult({ tempPassword: res.tempPassword });
			onCreated?.('Profesor creado exitosamente.');
			queryClient.invalidateQueries({ queryKey: ['teachers'] });
		},
		onError: (err) => {
			setError(getErrorMessage(err, 'Error al crear el profesor.'));
		},
	});

	function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);

		const name = normalizeName(form.name);
		const email = normalizeEmail(form.email);
		if (!name || !email) {
			setError('Nombre y email son requeridos.');
			return;
		}

		const rateRaw = form.hourlyRate.trim();
		const hourlyRate = rateRaw === '' ? undefined : Number(rateRaw);
		if (rateRaw !== '' && (isNaN(hourlyRate!) || hourlyRate! < 0)) {
			setError('El costo por hora debe ser un número positivo.');
			return;
		}

		createMutation.mutate({ name, email, hourlyRate });
	}

	function handleCopy() {
		if (!result?.tempPassword) return;
		navigator.clipboard.writeText(result.tempPassword);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}

	const canSubmit =
		normalizeName(form.name).length > 0 &&
		normalizeEmail(form.email).length > 0;

	return (
		<ResponsiveModal
			isOpen={isOpen}
			onClose={handleClose}
			title={result ? undefined : 'Nuevo Profesor'}
		>
			{result ? (
				<div className="flex flex-col items-center gap-4 px-6 py-8 text-center">
					<div className="bg-success/10 flex h-16 w-16 items-center justify-center rounded-full">
						<CircleCheckBig className="text-success h-9 w-9" />
					</div>
					<div>
						<p className="text-dark text-xl font-bold">
							Profesor creado exitosamente
						</p>
						<p className="text-sm text-gray-500">
							Comparte la contraseña temporal para que pueda iniciar sesión.
						</p>
					</div>
					<div className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left">
						<p className="text-sm font-semibold text-amber-800">
							Contraseña temporal
						</p>
						<div className="mt-2 flex items-center gap-2">
							<code className="text-dark flex-1 rounded-xl border border-amber-200 bg-white px-4 py-2 text-center font-mono text-base font-semibold tracking-wide">
								{result.tempPassword}
							</code>
							<Button
								type="button"
								variant="text"
								color="neutral"
								onClick={handleCopy}
								aria-label="Copiar contraseña"
								className="h-10 w-10 shrink-0 rounded-lg border border-amber-200 bg-white p-0 hover:bg-amber-100"
							>
								{copied ? (
									<Check className="text-success h-4 w-4" />
								) : (
									<Copy className="h-4 w-4 text-amber-700" />
								)}
							</Button>
						</div>
						<p className="mt-2 text-xs text-amber-700">
							Pídele cambiarla al iniciar sesión por primera vez.
						</p>
					</div>
					<Button className="h-11 w-full rounded-xl" onClick={handleClose}>
						Cerrar
					</Button>
				</div>
			) : (
				<form className="space-y-5 px-6 py-6" onSubmit={handleSubmit}>
					<div>
						<p className="text-sm text-gray-400">
							Crea una cuenta y envia una contraseña temporal.
						</p>
					</div>

					<Input
						label="Nombre completo"
						placeholder="Ej. Ana Valverde"
						value={form.name}
						onChange={(e) =>
							setForm((prev) => ({ ...prev, name: e.target.value }))
						}
					/>
					<Input
						type="email"
						label="Email"
						placeholder="correo@ejemplo.com"
						value={form.email}
						onChange={(e) =>
							setForm((prev) => ({ ...prev, email: e.target.value }))
						}
					/>
					<Input
						type="number"
						label="Costo por hora (opcional)"
						placeholder="Ej. 5000"
						value={form.hourlyRate}
						onChange={(e) =>
							setForm((prev) => ({ ...prev, hourlyRate: e.target.value }))
						}
					/>
					{error && <p className="text-danger text-sm">{error}</p>}
					<Button
						type="submit"
						className="h-11 w-full rounded-xl"
						disabled={!canSubmit || createMutation.isPending}
					>
						{createMutation.isPending ? 'Creando...' : 'Crear Profesor'}
					</Button>
				</form>
			)}
		</ResponsiveModal>
	);
}
