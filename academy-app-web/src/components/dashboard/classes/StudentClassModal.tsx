import { motion } from 'framer-motion';
import { BarChart2, BookCheck, Clock, Users, X } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/cn';
import { formatTime } from '@/utils/general';

import type { Cls } from './classes.types';

const LEVEL_COLORS: Record<string, string> = {
	BEGINNER: 'bg-success/20 text-success border-success/30',
	INTERMEDIATE: 'bg-primary/20 text-primary border-primary/30',
	ADVANCED: 'bg-warning/20 text-warning border-warning/30',
	MASTER: 'bg-dark/20 text-dark border-dark/30',
};

const LEVEL_TRANSLATIONS: Record<string, string> = {
	BEGINNER: 'Básico',
	INTERMEDIATE: 'Intermedio',
	ADVANCED: 'Avanzado',
	MASTER: 'Master',
};

type Props = {
	cls: Cls;
	isReserving: boolean;
	isCancelling: boolean;
	onReserve: () => void;
	onCancel: () => void;
	onClose: () => void;
};

export function StudentClassModal({
	cls,
	isReserving,
	isCancelling,
	onReserve,
	onCancel,
	onClose,
}: Props) {
	const start = new Date(cls.startsAt);
	const end = new Date(cls.endsAt);
	const isFull = cls._count.attendances >= cls.maxCapacity;
	const isEnrolled = cls.isEnrolled ?? false;
	const spotsLeft = cls.maxCapacity - cls._count.attendances;

	const dayLabel = new Intl.DateTimeFormat('es-CR', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
	}).format(start);

	return (
		<div
			className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				exit={{ opacity: 0, y: 20 }}
				transition={{ duration: 0.2 }}
				className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
			>
				{/* Header */}
				<div className="mb-4 flex items-start justify-between gap-3">
					<h2 className="text-dark text-lg font-bold leading-tight">
						{cls.name}
					</h2>
					<button
						onClick={onClose}
						className="mt-0.5 shrink-0 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
					>
						<X className="h-4 w-4" />
					</button>
				</div>

				{/* Info rows */}
				<div className="mb-5 space-y-3">
					<div className="flex items-center gap-2.5 text-sm text-gray-600">
						<Clock className="h-4 w-4 shrink-0 text-gray-400" />
						<span className="capitalize">{dayLabel}</span>
					</div>
					<div className="flex items-center gap-2.5 text-sm text-gray-600">
						<Clock className="h-4 w-4 shrink-0 text-gray-400 opacity-0" />
						<span className="font-mono text-xs">
							{formatTime(start)} — {formatTime(end)}
						</span>
					</div>
					<div className="flex items-center gap-2.5 text-sm">
						<BarChart2 className="h-4 w-4 shrink-0 text-gray-400" />
						<span
							className={cn(
								'rounded-full border px-2 py-0.5 text-xs font-medium',
								LEVEL_COLORS[cls.skillLevel] ??
									'border-transparent bg-gray-100 text-gray-600',
							)}
						>
							{LEVEL_TRANSLATIONS[cls.skillLevel] ?? cls.skillLevel}
						</span>
					</div>
					<div className="flex items-center gap-2.5 text-sm">
						<Users className="h-4 w-4 shrink-0 text-gray-400" />
						<span
							className={cn(
								isFull ? 'text-danger font-semibold' : 'text-gray-600',
							)}
						>
							{cls._count.attendances}/{cls.maxCapacity} inscritos
							{isFull
								? ' · Clase llena'
								: ` · ${spotsLeft} cupo${spotsLeft !== 1 ? 's' : ''} disponible${spotsLeft !== 1 ? 's' : ''}`}
						</span>
					</div>
					{cls.description && (
						<p className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-500">
							{cls.description}
						</p>
					)}
				</div>

				{/* Action */}
				{isEnrolled ? (
					<div className="space-y-2">
						<div className="flex items-center justify-center gap-2 rounded-xl bg-success/10 px-4 py-3 text-sm font-semibold text-success">
							<BookCheck className="h-4 w-4" />
							Ya estás inscrito en esta clase
						</div>
						<Button
							variant="outlined"
							color="danger"
							onClick={onCancel}
							disabled={isCancelling}
							className="w-full gap-2"
						>
							{isCancelling ? (
								<Spinner
									size="xs"
									className="border-danger/30 border-t-danger"
								/>
							) : null}
							Cancelar inscripción
						</Button>
					</div>
				) : (
					<Button
						variant="contained"
						onClick={onReserve}
						disabled={isFull || isReserving}
						className="w-full gap-2"
					>
						{isReserving ? (
							<Spinner size="xs" className="border-white/40 border-t-white" />
						) : (
							<BookCheck className="h-4 w-4" />
						)}
						{isFull ? 'Clase llena' : 'Reservar lugar'}
					</Button>
				)}
			</motion.div>
		</div>
	);
}
