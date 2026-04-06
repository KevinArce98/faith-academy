import { useState, type SubmitEvent } from 'react';
import { useApiClient } from '@/lib/api';
import { getErrorMessage } from '@/lib/errorMessages';
import { ResponsiveModal } from '@/components/ui/ResponsiveModal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { TeacherProfile } from '@/lib/interfaces/teachers';

type EditTeacherModalProps = {
	teacher: TeacherProfile | null;
	onClose: () => void;
	onUpdated: (message: string) => void;
};

export function EditTeacherModal({
	teacher,
	onClose,
	onUpdated,
}: EditTeacherModalProps) {
	const apiClient = useApiClient();
	const [name, setName] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [isPending, setIsPending] = useState(false);

	function handleClose() {
		setName('');
		setError(null);
		onClose();
	}

	const displayedName = teacher ? name || teacher.name || '' : '';

	async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();

		if (!teacher) return;

		const trimmed = displayedName.replace(/\s+/g, ' ').trim();

		if (!trimmed) {
			setError('El nombre es requerido.');
			return;
		}

		setIsPending(true);

		try {
			await apiClient(`/api/v1/teachers/${teacher.id}`, {
				method: 'PATCH',
				body: JSON.stringify({ name: trimmed }),
			});
			onUpdated('Información del profesor actualizada.');
			handleClose();
		} catch (err) {
			setError(getErrorMessage(err, 'Error al actualizar.'));
		} finally {
			setIsPending(false);
		}
	}

	return (
		<ResponsiveModal
			isOpen={!!teacher}
			onClose={handleClose}
			title='Editar Profesor'
		>
			{teacher && (
				<form className='space-y-4 px-6 py-6' onSubmit={handleSubmit}>
					<Input
						label='Nombre completo'
						value={displayedName}
						onChange={(e) => setName(e.target.value)}
						placeholder='Nombre del profesor'
						disabled={isPending}
					/>
					<Input
						label='Email'
						value={teacher.email}
						disabled
						className='bg-gray-50'
					/>
					{error && <p className='text-danger text-sm'>{error}</p>}
					<div className='flex gap-3 pt-2'>
						<Button
							type='button'
							variant='outlined'
							color='neutral'
							className='flex-1'
							onClick={handleClose}
							disabled={isPending}
						>
							Cancelar
						</Button>
						<Button type='submit' className='flex-1' disabled={isPending}>
							{isPending ? 'Guardando...' : 'Guardar cambios'}
						</Button>
					</div>
				</form>
			)}
		</ResponsiveModal>
	);
}
