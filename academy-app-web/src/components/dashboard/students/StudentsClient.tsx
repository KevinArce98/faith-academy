import { useAutoAnimate } from '@formkit/auto-animate/react';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
	Check,
	Clock,
	Eye,
	Loader2,
	Pencil,
	Plus,
	Search,
	Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { ResponsiveModal } from '@/components/ui/ResponsiveModal';
import { SelectMenu } from '@/components/ui/SelectMenu';
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
import { Tooltip } from '@/components/ui/Tooltip';
import { useDebounce } from '@/hooks/useDebounce';
import { usePagination } from '@/hooks/usePagination';
import { useApiClient } from '@/lib/api';
import { cn } from '@/lib/cn';
import { getErrorMessage } from '@/lib/errorMessages';
import {
	type Plan,
	type Student,
	type Subscription,
	currentSubscription,
	isSubscriptionExpired,
} from '@/lib/interfaces/students';
import { formatPrice, getInitials } from '@/utils/general';

import { EditStudentModal } from './EditStudentModal';
import { NewStudentModal } from './NewStudentModal';
import { StudentDrawer } from './StudentDrawer';

type StudentsClientProps = {
	students: Student[];
	plans: Plan[];
	total: number;
};

type ToastState = { type: 'success' | 'error'; message: string } | null;

function planBadgeClass(name: string) {
	const n = name.toLowerCase();
	if (n.includes('vip')) return 'bg-primary text-white';
	if (n.includes('pro')) return 'bg-dark text-white';
	return 'bg-gray-100 text-gray-600';
}

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
	const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'unpaid'>(
		'all',
	);
	const [modalOpen, setModalOpen] = useState(false);
	const [selected, setSelected] = useState<Student | null>(null);
	const [tbodyRef] = useAutoAnimate<HTMLTableSectionElement>();
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

				const matchesStatus =
					statusFilter === 'all' ||
					(statusFilter === 'active' && s.isActive) ||
					(statusFilter === 'inactive' && !s.isActive);

				const sub = currentSubscription(s);
				const matchesPlan = planFilter === 'all' || sub?.plan.id === planFilter;

				const matchesPayment =
					paymentFilter === 'all' ||
					(paymentFilter === 'paid' && sub?.isPaid) ||
					(paymentFilter === 'unpaid' && (!sub || !sub.isPaid));

				return matchesSearch && matchesStatus && matchesPlan && matchesPayment;
			}),
		[students, debouncedSearch, statusFilter, planFilter, paymentFilter],
	);

	const pagination = usePagination(filtered, { pageSize: 10 });

	useEffect(() => {
		pagination.reset();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [debouncedSearch, statusFilter, planFilter, paymentFilter]);

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

	async function togglePaid(sub: Subscription) {
		setLoadingId(sub.id);
		try {
			await apiClient(`/api/v1/subscriptions/${sub.id}/pay`, {
				method: 'PATCH',
				body: JSON.stringify({ isPaid: !sub.isPaid }),
			});
			await queryClient.invalidateQueries({ queryKey: ['students'] });
		} catch (err) {
			setToast({
				type: 'error',
				message: getErrorMessage(err, 'Error al actualizar el pago.'),
			});
		} finally {
			setLoadingId(null);
		}
	}

	function PaymentBadge({ sub }: { sub: Subscription | null }) {
		if (!sub) return <span className="text-xs text-gray-300">Sin plan</span>;
		const loading = loadingId === sub.id;
		const expired = isSubscriptionExpired(sub);
		const state = expired ? 'expired' : sub.isPaid ? 'paid' : 'pending';
		return (
			<Tooltip
				label={
					sub.isPaid
						? expired
							? 'Plan vencido — clic para renovar (marcar pagado)'
							: 'Clic para marcar como pendiente'
						: 'Clic para marcar como pagado'
				}
			>
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						togglePaid(expired ? { ...sub, isPaid: false } : sub);
					}}
					disabled={loading}
					className={cn(
						'inline-flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition-all hover:shadow-sm active:scale-95 disabled:cursor-wait disabled:opacity-60',
						state === 'paid' &&
							'border-success/30 bg-success/10 text-success hover:bg-success/20',
						state === 'pending' &&
							'border-warning/40 bg-warning/10 text-warning hover:bg-warning/20',
						state === 'expired' &&
							'border-danger/30 bg-danger/10 text-danger hover:bg-danger/20',
					)}
				>
					{loading ? (
						<Loader2 className="h-3 w-3 animate-spin" />
					) : state === 'paid' ? (
						<Check className="h-3 w-3" />
					) : (
						<Clock className="h-3 w-3" />
					)}
					{loading
						? 'Guardando…'
						: state === 'expired'
							? 'Vencido'
							: state === 'paid'
								? 'Pagado'
								: 'Pendiente'}
				</button>
			</Tooltip>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<div className="flex items-center gap-3">
					<h1 className="text-dark text-2xl font-bold md:text-3xl">Alumnos</h1>
					<span className="text-sm text-gray-400">{total} alumnos</span>
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
					<SelectMenu
						className="w-40 shrink-0"
						buttonClassName="h-9"
						value={statusFilter}
						onChange={setStatusFilter}
						options={[
							{ value: 'all', label: 'Todos los estados' },
							{ value: 'active', label: 'Activo' },
							{ value: 'inactive', label: 'Inactivo' },
						]}
					/>
					<SelectMenu
						className="w-44 shrink-0"
						buttonClassName="h-9"
						value={planFilter}
						onChange={setPlanFilter}
						options={[
							{ value: 'all', label: 'Todos los planes' },
							...plans.map((p) => ({ value: p.id, label: p.name })),
						]}
					/>
					<SelectMenu
						className="w-44 shrink-0"
						buttonClassName="h-9"
						value={paymentFilter}
						onChange={(v) => setPaymentFilter(v as 'all' | 'paid' | 'unpaid')}
						options={[
							{ value: 'all', label: 'Todos los pagos' },
							{ value: 'paid', label: 'Pagado este mes' },
							{ value: 'unpaid', label: 'Pendiente' },
						]}
					/>
				</div>
			</div>

			{/* Desktop Table */}
			<div className="hidden md:block">
				<TableContainer>
					<Table>
						<TableHead>
							<TableHeader className="pl-5">Alumno</TableHeader>
							<TableHeader>Plan</TableHeader>
							<TableHeader>Mensualidad</TableHeader>
							<TableHeader>Matrícula</TableHeader>
							<TableHeader>Pago del mes</TableHeader>
							<TableHeader>Estado</TableHeader>
							<TableHeader>Acciones</TableHeader>
						</TableHead>
						<TableBody ref={tbodyRef}>
							{pagination.paginated.length === 0 ? (
								<TableEmpty colSpan={7}>Sin alumnos</TableEmpty>
							) : (
								pagination.paginated.map((student) => {
									const sub = currentSubscription(student);
									return (
										<TableRow
											key={student.id}
											className="cursor-pointer"
											onClick={() => setSelected(student)}
										>
											<TableCell className="pl-5">
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
												{sub ? (
													<span
														className={cn(
															'rounded-full px-2.5 py-1 text-xs font-medium',
															planBadgeClass(sub.plan.name),
														)}
													>
														{sub.plan.name}
													</span>
												) : (
													<span className="text-xs text-gray-300">—</span>
												)}
											</TableCell>
											<TableCell className="text-dark text-sm font-medium">
												{sub ? formatPrice(sub.amount) : '—'}
											</TableCell>
											<TableCell className="text-dark text-sm">
												{student.enrollmentFee != null
													? formatPrice(student.enrollmentFee)
													: '—'}
											</TableCell>
											<TableCell onClick={(e) => e.stopPropagation()}>
												<PaymentBadge sub={sub} />
											</TableCell>
											<TableCell>
												<span
													className={cn(
														'rounded-full px-2.5 py-1 text-xs font-semibold',
														student.isActive
															? 'bg-success/10 text-success'
															: 'bg-gray-100 text-gray-500',
													)}
												>
													{student.isActive ? 'ACTIVO' : 'INACTIVO'}
												</span>
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
						const sub = currentSubscription(student);
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
									<span
										className={cn(
											'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
											student.isActive
												? 'bg-success/10 text-success'
												: 'bg-gray-100 text-gray-500',
										)}
									>
										{student.isActive ? 'ACTIVO' : 'INACTIVO'}
									</span>
								</div>
								<div className="mb-2 flex flex-wrap items-center gap-2">
									{sub ? (
										<span
											className={cn(
												'rounded-full px-2.5 py-1 text-xs font-medium',
												planBadgeClass(sub.plan.name),
											)}
										>
											{sub.plan.name}
										</span>
									) : null}
									<span className="text-dark text-xs font-medium">
										{sub ? formatPrice(sub.amount) : 'Sin mensualidad'}
									</span>
								</div>
								<div className="flex items-center justify-between">
									<PaymentBadge sub={sub} />
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
