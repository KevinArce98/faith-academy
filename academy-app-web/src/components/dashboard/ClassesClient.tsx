import { AnimatePresence } from 'framer-motion';
import {
	Clock,
	GraduationCap,
	Pencil,
	Plus,
	Search,
	Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { DeleteClassModal } from '@/components/dashboard/classes/DeleteClassModal';
import { EditClassModal } from '@/components/dashboard/classes/EditClassModal';
import { NewClassModal } from '@/components/dashboard/classes/NewClassModal';
import {
	type ClassesClientProps,
	type Cls,
	LEVEL_COLORS,
	LEVEL_LABELS,
} from '@/components/dashboard/classes/classes.types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/cn';

export function ClassesClient({ classes, teachers, role }: ClassesClientProps) {
	const isAdmin = role === 'ADMIN';
	const [search, setSearch] = useState('');
	const [creating, setCreating] = useState(false);
	const [editing, setEditing] = useState<Cls | null>(null);
	const [deleting, setDeleting] = useState<Cls | null>(null);

	const teacherName = useMemo(() => {
		const map = new Map(teachers.map((t) => [t.id, t.name]));
		return (id: string) => map.get(id) || null;
	}, [teachers]);

	const filtered = useMemo(() => {
		const q = search.toLowerCase();
		return classes.filter((c) => c.name.toLowerCase().includes(q));
	}, [classes, search]);

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<div className="flex items-center gap-3">
					<h1 className="text-dark text-2xl font-bold md:text-3xl">Clases</h1>
					<span className="text-sm text-gray-400">{classes.length} clases</span>
				</div>
				{isAdmin && (
					<Button
						variant="contained"
						onClick={() => setCreating(true)}
						className="hidden md:inline-flex"
					>
						+ Nueva Clase
					</Button>
				)}
			</div>

			{/* Mobile FAB */}
			{isAdmin && (
				<button
					onClick={() => setCreating(true)}
					className="bg-primary fixed right-6 bottom-6 z-30 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg active:scale-95 md:hidden"
					aria-label="Nueva Clase"
				>
					<Plus className="h-6 w-6" />
				</button>
			)}

			{/* Search */}
			<div className="w-full md:max-w-xs">
				<Input
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					placeholder="Buscar clase..."
					startIcon={<Search className="h-4 w-4" />}
					className="h-9"
				/>
			</div>

			{/* Grid */}
			{filtered.length === 0 ? (
				<div className="rounded-xl border border-dashed border-gray-200 py-16 text-center text-sm text-gray-400">
					Sin clases
				</div>
			) : (
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{filtered.map((cls) => (
						<div
							key={cls.id}
							className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
						>
							<div className="flex items-start justify-between gap-2">
								<h2 className="text-dark font-bold">{cls.name}</h2>
								<div className="flex shrink-0 flex-col items-end gap-1">
									<span
										className={cn(
											'rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase',
											LEVEL_COLORS[cls.skillLevel] ?? 'bg-gray-100 text-gray-500',
										)}
									>
										{LEVEL_LABELS[cls.skillLevel] ?? cls.skillLevel}
									</span>
									{cls.isPrivate && (
										<span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold tracking-wide text-amber-700 uppercase">
											Privada
										</span>
									)}
								</div>
							</div>

							<div className="space-y-1.5 text-sm text-gray-600">
								<div className="flex items-center gap-2">
									<GraduationCap className="h-4 w-4 text-gray-300" />
									{teacherName(cls.teacherId)
										? `Prof. ${teacherName(cls.teacherId)}`
										: 'Sin profesor'}
								</div>
								{cls.schedule && (
									<div className="flex items-center gap-2">
										<Clock className="h-4 w-4 text-gray-300" />
										{cls.schedule}
									</div>
								)}
							</div>

							{cls.description && (
								<p className="text-sm leading-snug text-gray-400">
									{cls.description}
								</p>
							)}

							{isAdmin && (
								<div className="mt-auto flex gap-2 pt-1">
									<Button
										variant="outlined"
										color="neutral"
										className="flex-1"
										onClick={() => setEditing(cls)}
									>
										<Pencil className="h-3.5 w-3.5" /> Editar
									</Button>
									<Button
										color="danger"
										onClick={() => setDeleting(cls)}
										aria-label="Eliminar clase"
									>
										<Trash2 className="h-3.5 w-3.5" />
									</Button>
								</div>
							)}
						</div>
					))}
				</div>
			)}

			{/* Modals */}
			<AnimatePresence>
				{creating && (
					<NewClassModal
						key="new-class"
						teachers={teachers}
						onClose={() => setCreating(false)}
					/>
				)}
				{editing && (
					<EditClassModal
						key="edit-class"
						cls={editing}
						teachers={teachers}
						onClose={() => setEditing(null)}
					/>
				)}
			</AnimatePresence>

			<AnimatePresence>
				{deleting && (
					<DeleteClassModal
						key="delete-class"
						classData={deleting}
						onClose={() => setDeleting(null)}
					/>
				)}
			</AnimatePresence>
		</div>
	);
}
