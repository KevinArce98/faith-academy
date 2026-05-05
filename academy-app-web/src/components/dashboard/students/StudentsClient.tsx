import { useAutoAnimate } from '@formkit/auto-animate/react';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Eye, Pencil, Plus, Search, Trash2, Users2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { ResponsiveModal } from '@/components/ui/ResponsiveModal';
import { Select } from '@/components/ui/Select';
import {
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableEmpty,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/Table';
import { useDebounce } from '@/hooks/useDebounce';
import { usePagination } from '@/hooks/usePagination';
import { useApiClient } from '@/lib/api';
import { cn } from '@/lib/cn';
import { getErrorMessage } from '@/lib/errorMessages';
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/interfaces/students';
import type { Plan, Student } from '@/lib/interfaces/students';
import { getInitials } from '@/utils/general';

import { EditStudentModal } from './EditStudentModal';
import { NewStudentModal } from './NewStudentModal';
import { StudentDrawer } from './StudentDrawer';

type StudentsClientProps = {
	students: Student[];
	plans: Plan[];
	total: number;
};

type ToastState = { type: 'success' | 'error'; message: string } | null;

export function StudentsClient({
	students,
	plans,
	total,
}: StudentsClientProps) {
	const queryClient = useQueryClient();
	const apiClient = useApiClient();
	const [search, setSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState('all');
	const [planFilter, setPlanFilter] = useState('all');
	const [familyFilter, setFamilyFilter] = useState<'all' | 'with' | 'without'>(
		'all',
	);
	const [modalOpen, setModalOpen] = useState(false);
	const [selected, setSelected] = useState<Student | null>(null);
	const [tbodyRef] = useAutoAnimate<HTMLTableSectionElement>();
	const [rowsSelected, setRowsSelected] = useState<Student[]>([]);
	const [editing, setEditing] = useState<Student | null>(null);
	const [deleting, setDeleting] = useState<Student | null>(null);
	const [loadingId, setLoadingId] = useState<string | null>(null);
	const [toast, setToast] = useState<ToastState>(null);

	const debouncedSearch = useDebounce(search, 300);

	const filtered = useMemo(
		() =>
			students.filter((s) => {
				const matchesSearch =
					s.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
					s.email.toLowerCase().includes(debouncedSearch.toLowerCase());

				const activeOrder = s.orders.find((o) => o.status === 'ACTIVE');
				const status = activeOrder?.status ?? 'EXPIRED';

				const matchesStatus =
					statusFilter === 'all' ||
					(statusFilter === 'ACTIVE' && status === 'ACTIVE') ||
					(statusFilter === 'EXPIRED' && status === 'EXPIRED') ||
					(statusFilter === 'PENDING_REVIEW' && status === 'PENDING_REVIEW');

				const matchesPlan =
					planFilter === 'all' ||
					(activeOrder && activeOrder.plan.id === planFilter);

				const matchesFamily =
					familyFilter === 'all' ||
					(familyFilter === 'with' && s.familyMember) ||
					(familyFilter === 'without' && !s.familyMember);

				return matchesSearch && matchesStatus && matchesPlan && matchesFamily;
			}),
		[students, debouncedSearch, statusFilter, planFilter, familyFilter],
	);

	const pagination = usePagination(filtered, { pageSize: 10 });

	// Reset to page 1 when search or filters change
	useEffect(() => {
		pagination.reset();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [debouncedSearch, statusFilter, planFilter, familyFilter]);

	async function deleteStudent(student: Student) {
		setLoadingId(student.id);
		try {
			await apiClient(`/api/v1/students/${student.id}`, { method: 'DELETE' });
			setToast({ type: 'success', message: `${student.name} eliminado.` });
			setDeleting(null);
			setSelected((current) => (current?.id === student.id ? null : current));
			queryClient.invalidateQueries({ queryKey: ['students'] });
		} catch (err) {
			setToast({
				type: 'error',
				message: getErrorMessage(err, 'Error al eliminar alumno.'),
			});
		} finally {
			setLoadingId(null);
		}
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<div className="flex items-center gap-3">
					<h1 className="text-dark text-2xl font-bold md:text-3xl">Alumnos</h1>
					<span className="text-sm text-gray-400">{total} alumnos activos</span>
				</div>
				<Button
					variant="contained"
					onClick={() => setModalOpen(true)}
					className="hidden md:inline-flex"
				>
					+ Nuevo Alumno
				</Button>
			</div>

			{toast && (
				<div
					className={cn(
						'rounded-xl border px-4 py-3 text-sm font-medium',
						toast.type === 'success'
							? 'border-success/20 bg-success/10 text-success'
							: 'border-danger/20 bg-danger/10 text-danger',
					)}
				>
					{toast.message}
				</div>
			)}

			{/* Mobile FAB */}
			<button
				onClick={() => setModalOpen(true)}
				className="bg-primary fixed right-6 bottom-6 z-30 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg active:scale-95 md:hidden"
				aria-label="Nuevo Alumno"
			>
				<Plus className="h-6 w-6" />
			</button>

			{/* Filters */}
			<div className="space-y-3">
				<div className="w-full md:max-w-xs">
					<Input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Buscar por nombre o email..."
						startIcon={<Search className="h-4 w-4" />}
						className="h-9"
					/>
				</div>
				<div
					className="flex items-center gap-3 overflow-x-auto pb-1"
					style={{ WebkitOverflowScrolling: 'touch' }}
				>
					<Select
						value={statusFilter}
						onChange={(e) => setStatusFilter(e.target.value)}
						className="h-9 shrink-0"
					>
						<option value="all">Todos los estados</option>
						<option value="ACTIVE">Activo</option>
						<option value="EXPIRED">Vencido</option>
						<option value="PENDING_REVIEW">En revision</option>
					</Select>
					<Select
						value={planFilter}
						onChange={(e) => setPlanFilter(e.target.value)}
						className="h-9 shrink-0"
					>
						<option value="all">Todos los planes</option>
						{plans.map((p) => (
							<option key={p.id} value={p.id}>
								{p.name}
							</option>
						))}
					</Select>
					<Button
						variant={familyFilter === 'with' ? 'contained' : 'text'}
						color="neutral"
						onClick={() =>
							setFamilyFilter(
								familyFilter === 'with'
									? 'all'
									: familyFilter === 'all'
										? 'with'
										: 'all',
							)
						}
						className="text-dark h-9 shrink-0 border border-gray-200 px-4 text-sm font-medium hover:bg-gray-50"
					>
						<Users2 className="h-4 w-4" /> Familia
					</Button>
				</div>
			</div>

			{/* Desktop Table */}
			<div className="hidden md:block">
				<TableContainer>
					<Table>
						<TableHead>
							<TableHeader className="w-8 px-3 pl-5">
								<Checkbox
									checked={
										filtered.length > 0 &&
										rowsSelected.length === filtered.length
									}
									onChange={(e) => {
										if (e.target.checked) {
											setRowsSelected(filtered);
										} else {
											setRowsSelected([]);
										}
									}}
								/>
							</TableHeader>
							<TableHeader>Alumno</TableHeader>
							<TableHeader>Plan</TableHeader>
							<TableHeader>Creditos</TableHeader>
							<TableHeader>Vencimiento</TableHeader>
							<TableHeader>Estado</TableHeader>
							<TableHeader>Familia</TableHeader>
							<TableHeader>Acciones</TableHeader>
						</TableHead>
						<TableBody ref={tbodyRef}>
							{pagination.paginated.length === 0 ? (
								<TableEmpty colSpan={8}>Sin alumnos</TableEmpty>
							) : (
								pagination.paginated.map((student) => {
									const activeOrder = student.orders.find(
										(o) => o.status === 'ACTIVE',
									);
									const status = activeOrder?.status ?? 'EXPIRED';
									return (
										<TableRow
											key={student.id}
											className="cursor-pointer"
											onClick={() => setSelected(student)}
										>
											<TableCell
												className="w-8 py-3 pl-5"
												onClick={(e) => e.stopPropagation()}
											>
												<Checkbox
													checked={rowsSelected.includes(student)}
													onChange={(e) => {
														if (e.target.checked) {
															setRowsSelected([...rowsSelected, student]);
														} else {
															setRowsSelected(
																rowsSelected.filter((s) => s.id !== student.id),
															);
														}
													}}
												/>
											</TableCell>
											<TableCell>
												<div className="flex items-center gap-2.5">
													<div className="bg-dark flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
														<span className="text-xs font-bold text-white">
															{getInitials(student.name)}
														</span>
													</div>
													<div>
														<p className="text-dark font-medium">
															{student.name}
														</p>
														<p className="text-xs text-gray-400">
															{student.email}
														</p>
													</div>
												</div>
											</TableCell>
											<TableCell>
												{activeOrder ? (
													<span
														className={cn(
															'rounded-full px-2.5 py-1 text-xs font-medium',
															activeOrder.plan.name
																.toLowerCase()
																.includes('vip')
																? 'bg-primary text-white'
																: activeOrder.plan.name
																			.toLowerCase()
																			.includes('pro')
																	? 'bg-dark text-white'
																	: 'bg-gray-100 text-gray-600',
														)}
													>
														{activeOrder.plan.name}
													</span>
												) : (
													<span className="text-xs text-gray-300">—</span>
												)}
											</TableCell>
											<TableCell>
												{activeOrder ? (
													(() => {
														const total = activeOrder.creditGranted;
														const balance =
															activeOrder.ledgerEntries?.[0]?.balance ?? total;
														const pct =
															total != null && balance != null
																? Math.max(
																		0,
																		Math.min(100, (balance / total) * 100),
																	)
																: null;
														const barColor =
															pct == null
																? 'bg-primary'
																: pct > 50
																	? 'bg-primary'
																	: pct > 20
																		? 'bg-warning'
																		: 'bg-danger';
														return (
															<div>
																<span className="text-dark text-sm font-medium">
																	{total != null
																		? `${balance ?? total}/${total}`
																		: '∞'}
																</span>
																{pct != null && (
																	<div className="mt-1 h-1 w-16 rounded-full bg-gray-100">
																		<div
																			className={cn(
																				'h-1 rounded-full',
																				barColor,
																			)}
																			style={{ width: `${pct}%` }}
																		/>
																	</div>
																)}
															</div>
														);
													})()
												) : (
													<span className="text-xs text-gray-300">—</span>
												)}
											</TableCell>
											<TableCell className="text-dark text-sm">
												{activeOrder?.expiresAt
													? new Intl.DateTimeFormat('es-CR', {
															day: 'numeric',
															month: 'short',
															year: 'numeric',
														}).format(new Date(activeOrder.expiresAt))
													: '—'}
											</TableCell>
											<TableCell>
												<span
													className={cn(
														'rounded-full px-2.5 py-1 text-xs font-semibold',
														STATUS_COLORS[status] ??
															'bg-gray-100 text-gray-500',
													)}
												>
													{STATUS_LABELS[status] ?? status}
												</span>
											</TableCell>
											<TableCell>
												{student.familyMember ? (
													<Users2 className="h-4 w-4 text-gray-400" />
												) : null}
											</TableCell>
											<TableCell>
												<div
													className="flex items-center gap-1"
													onClick={(e) => e.stopPropagation()}
												>
													<Button
														variant="text"
														color="neutral"
														onClick={() => setSelected(student)}
														className="h-auto p-1.5 text-gray-400"
													>
														<Eye className="h-4 w-4" />
													</Button>
													<Button
														variant="text"
														color="neutral"
														onClick={() => setEditing(student)}
														className="h-auto p-1.5 text-gray-400"
														disabled={loadingId === student.id}
													>
														<Pencil className="h-4 w-4" />
													</Button>
													<Button
														variant="text"
														color="neutral"
														onClick={() => setDeleting(student)}
														className="h-auto p-1.5 text-gray-400"
														disabled={loadingId === student.id}
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</div>
											</TableCell>
										</TableRow>
									);
								})
							)}
						</TableBody>
					</Table>

					{/* Pagination */}
					<div className="border-t border-gray-50">
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
							label="alumnos"
						/>
					</div>
				</TableContainer>
			</div>

			{/* Mobile Cards */}
			<div className="space-y-3 md:hidden">
				{pagination.paginated.length === 0 ? (
					<p className="py-8 text-center text-sm text-gray-400">Sin alumnos</p>
				) : (
					pagination.paginated.map((student) => {
						const activeOrder = student.orders.find(
							(o) => o.status === 'ACTIVE',
						);
						const status = activeOrder?.status ?? 'EXPIRED';
						return (
							<div
								key={student.id}
								className="cursor-pointer rounded-xl bg-white p-4 shadow-sm transition-transform active:scale-[0.98]"
								onClick={() => setSelected(student)}
							>
								<div className="mb-2 flex items-center gap-2.5">
									<div className="bg-dark flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
										<span className="text-xs font-bold text-white">
											{getInitials(student.name)}
										</span>
									</div>
									<div className="min-w-0 flex-1">
										<p className="text-dark truncate text-sm font-bold">
											{student.name}
										</p>
										<p className="truncate text-xs text-gray-400">
											{student.email}
										</p>
									</div>
								</div>
								<div className="mb-2 flex items-center gap-2">
									{activeOrder ? (
										<span
											className={cn(
												'rounded-full px-2.5 py-1 text-xs font-medium',
												activeOrder.plan.name.toLowerCase().includes('vip')
													? 'bg-primary text-white'
													: activeOrder.plan.name.toLowerCase().includes('pro')
														? 'bg-dark text-white'
														: 'bg-gray-100 text-gray-600',
											)}
										>
											{activeOrder.plan.name}
										</span>
									) : null}
									<span
										className={cn(
											'rounded-full px-2.5 py-1 text-xs font-semibold',
											STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-500',
										)}
									>
										{STATUS_LABELS[status] ?? status}
									</span>
								</div>
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										{activeOrder
											? (() => {
													const total = activeOrder.creditGranted;
													const balance =
														activeOrder.ledgerEntries?.[0]?.balance ?? total;
													const pct =
														total != null && balance != null
															? Math.max(
																	0,
																	Math.min(100, (balance / total) * 100),
																)
															: null;
													const barColor =
														pct == null
															? 'bg-primary'
															: pct > 50
																? 'bg-primary'
																: pct > 20
																	? 'bg-warning'
																	: 'bg-danger';
													return (
														<>
															<span className="text-dark text-xs font-medium">
																{total != null
																	? `${balance ?? total}/${total}`
																	: '∞'}
															</span>
															{pct != null && (
																<div className="h-1 w-12 rounded-full bg-gray-100">
																	<div
																		className={cn('h-1 rounded-full', barColor)}
																		style={{ width: `${pct}%` }}
																	/>
																</div>
															)}
														</>
													);
												})()
											: null}
										{activeOrder?.expiresAt && (
											<span className="text-xs text-gray-400">
												{new Intl.DateTimeFormat('es-CR', {
													day: 'numeric',
													month: 'short',
												}).format(new Date(activeOrder.expiresAt))}
											</span>
										)}
									</div>
									<div
										className="flex items-center gap-1"
										onClick={(e) => e.stopPropagation()}
									>
										<button
											onClick={() => setSelected(student)}
											className="flex min-h-[44px] min-w-[44px] items-center justify-center text-gray-400"
											disabled={loadingId === student.id}
										>
											<Eye className="h-4 w-4" />
										</button>
										<button
											onClick={() => setEditing(student)}
											className="flex min-h-[44px] min-w-[44px] items-center justify-center text-gray-400"
											disabled={loadingId === student.id}
										>
											<Pencil className="h-4 w-4" />
										</button>
										<button
											onClick={() => setDeleting(student)}
											className="flex min-h-[44px] min-w-[44px] items-center justify-center text-gray-400"
											disabled={loadingId === student.id}
										>
											<Trash2 className="h-4 w-4" />
										</button>
									</div>
								</div>
							</div>
						);
					})
				)}
				{/* Mobile Pagination */}
				<div className="mt-4 rounded-xl bg-white shadow-sm">
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
						label="alumnos"
					/>
				</div>
			</div>

			{/* Modals */}
			<AnimatePresence>
				{modalOpen && (
					<NewStudentModal
						key="new-student-modal"
						plans={plans}
						onClose={() => setModalOpen(false)}
					/>
				)}
			</AnimatePresence>
			<AnimatePresence>
				{selected && (
					<StudentDrawer
						key="student-drawer"
						student={selected}
						onClose={() => setSelected(null)}
					/>
				)}
			</AnimatePresence>
			<AnimatePresence>
				{selected && (
					<motion.div
						key="drawer-overlay"
						className="fixed inset-0 z-30 bg-black/20"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={() => setSelected(null)}
					/>
				)}
			</AnimatePresence>

			<EditStudentModal
				student={editing}
				plans={plans}
				onClose={() => setEditing(null)}
				onUpdated={(message) => {
					setToast({ type: 'success', message });
					setEditing(null);
					queryClient.invalidateQueries({ queryKey: ['students'] });
				}}
			/>

			<ResponsiveModal
				isOpen={!!deleting}
				onClose={() => setDeleting(null)}
				title="Eliminar Alumno"
			>
				{deleting && (
					<div className="space-y-4 p-6">
						<p className="text-sm text-gray-600">
							{`¿Eliminar a ${deleting.name}? Esta acción no se puede deshacer.`}
						</p>
						<div className="flex gap-3">
							<Button
								type="button"
								variant="outlined"
								color="neutral"
								className="flex-1"
								onClick={() => setDeleting(null)}
							>
								Cancelar
							</Button>
							<Button
								type="button"
								color="danger"
								className="flex-1"
								onClick={() => deleteStudent(deleting)}
								disabled={loadingId === deleting.id}
							>
								Confirmar
							</Button>
						</div>
					</div>
				)}
			</ResponsiveModal>
		</div>
	);
}
