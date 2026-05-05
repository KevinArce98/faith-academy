import { useAutoAnimate } from '@formkit/auto-animate/react';
import type {
	EventClickArg,
	EventContentArg,
	EventInput,
} from '@fullcalendar/core';
import esLocale from '@fullcalendar/core/locales/es';
import interactionPlugin from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import {
	BookCheck,
	Calendar,
	ChevronLeft,
	ChevronRight,
	Edit,
	List,
	Trash2,
	Users,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { ClassStudentsModal } from '@/components/dashboard/classes/ClassStudentsModal';
import { DeleteClassModal } from '@/components/dashboard/classes/DeleteClassModal';
import { EditClassModal } from '@/components/dashboard/classes/EditClassModal';
import { NewClassModal } from '@/components/dashboard/classes/NewClassModal';
import { StudentClassModal } from '@/components/dashboard/classes/StudentClassModal';
import type {
	ClassesClientProps,
	Cls,
} from '@/components/dashboard/classes/classes.types';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import {
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/Table';
import { usePagination } from '@/hooks/usePagination';
import { useApiClient } from '@/lib/api';
import { cn } from '@/lib/cn';
import { getErrorMessage } from '@/lib/errorMessages';
import { formatTime } from '@/utils/general';

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

type ReserveState = {
	classId: string;
	status: 'loading' | 'success' | 'error';
	message?: string;
} | null;

export function ClassesClient({
	classes,
	teachers,
	weekStart,
	role,
	userId,
}: ClassesClientProps) {
	const isStudent = role === 'STUDENT';
	const isAdmin = role === 'ADMIN';
	const isTeacher = role === 'TEACHER';
	// Teachers can view/manage student enrollment for their own classes only
	const canViewStudents = (cls: Cls) =>
		isAdmin || (isTeacher && cls.teacherId === userId);

	const apiClient = useApiClient();
	const queryClient = useQueryClient();

	const [view, setView] = useState<'week' | 'list'>('week');
	const [modalOpen, setModal] = useState(false);
	const [editModalOpen, setEditModalOpen] = useState(false);
	const [deleteModalOpen, setDeleteModalOpen] = useState(false);
	const [selectedClass, setSelectedClass] = useState<Cls | null>(null);
	const [currentWeek, setWeek] = useState(new Date(weekStart));
	const [listRef] = useAutoAnimate<HTMLTableSectionElement>();
	const [isMobile, setIsMobile] = useState(false);
	const calendarRef = useRef<FullCalendar>(null);
	const listPagination = usePagination(classes, { pageSize: 10 });

	const [reserveState, setReserveState] = useState<ReserveState>(null);
	const [cancelState, setCancelState] = useState<{
		classId: string;
		status: 'loading' | 'error';
		message?: string;
	} | null>(null);
	const [studentModalClass, setStudentModalClass] = useState<Cls | null>(null);
	const [studentsModalClass, setStudentsModalClass] = useState<Cls | null>(
		null,
	);

	useEffect(() => {
		const check = () => {
			const mobile = window.innerWidth < 768;
			setIsMobile(mobile);
			if (mobile && view === 'week') setView('list');
		};
		check();
		window.addEventListener('resize', check);
		return () => window.removeEventListener('resize', check);
	}, [view]);

	useEffect(() => {
		calendarRef.current?.getApi().gotoDate(currentWeek);
	}, [currentWeek]);

	const weekDays = Array.from({ length: 7 }, (_, i) => {
		const d = new Date(currentWeek);
		d.setDate(d.getDate() + i);
		return d;
	});

	function prevWeek() {
		const d = new Date(currentWeek);
		d.setDate(d.getDate() - 7);
		setWeek(d);
	}
	function nextWeek() {
		const d = new Date(currentWeek);
		d.setDate(d.getDate() + 7);
		setWeek(d);
	}
	function goToday() {
		setWeek(new Date(weekStart));
	}

	async function handleReserve(cls: Cls) {
		setReserveState({ classId: cls.id, status: 'loading' });
		try {
			await apiClient(`/api/v1/classes/${cls.id}/reserve`, { method: 'POST' });
			setReserveState({
				classId: cls.id,
				status: 'success',
				message: `Reservado en ${cls.name}`,
			});
			setStudentModalClass(null);
			queryClient.invalidateQueries({ queryKey: ['classes'] });
			queryClient.invalidateQueries({ queryKey: ['dashboard'] });
			setTimeout(() => setReserveState(null), 3000);
		} catch (err) {
			const message = getErrorMessage(err, 'No se pudo reservar la clase');
			setReserveState({ classId: cls.id, status: 'error', message });
			setTimeout(() => setReserveState(null), 4000);
		}
	}

	async function handleCancel(cls: Cls) {
		setCancelState({ classId: cls.id, status: 'loading' });
		try {
			await apiClient(`/api/v1/classes/${cls.id}/reserve`, {
				method: 'DELETE',
			});
			setCancelState(null);
			setStudentModalClass(null);
			queryClient.invalidateQueries({ queryKey: ['classes'] });
			queryClient.invalidateQueries({ queryKey: ['dashboard'] });
		} catch (err) {
			const message = getErrorMessage(err, 'No se pudo cancelar la reserva');
			setCancelState({ classId: cls.id, status: 'error', message });
			setTimeout(() => setCancelState(null), 4000);
		}
	}

	const weekLabel = `${weekDays[0].getDate()} — ${weekDays[6].getDate()} ${new Intl.DateTimeFormat('es-CR', { month: 'long', year: 'numeric' }).format(weekDays[6])}`;

	const fcEvents: EventInput[] = classes.map((cls) => {
		const start = new Date(cls.startsAt);
		const end = new Date(cls.endsAt);
		const dayOfWeek = (start.getDay() + 6) % 7;
		const weekDate = new Date(currentWeek);
		weekDate.setDate(weekDate.getDate() + dayOfWeek);
		const adjStart = new Date(weekDate);
		adjStart.setHours(start.getHours(), start.getMinutes(), 0, 0);
		const adjEnd = new Date(weekDate);
		adjEnd.setHours(end.getHours(), end.getMinutes(), 0, 0);
		return {
			id: cls.id,
			title: cls.name,
			start: adjStart,
			end: adjEnd,
			backgroundColor: 'transparent',
			borderColor: 'transparent',
			extendedProps: cls,
		};
	});

	function renderEventContent(arg: EventContentArg) {
		const cls = arg.event.extendedProps as Cls;
		const colors =
			LEVEL_COLORS[cls.skillLevel] ??
			'bg-gray-100 text-gray-600 border-gray-200';
		const isFull = cls._count.attendances >= cls.maxCapacity;
		return (
			<div
				className={cn(
					'h-full w-full overflow-hidden rounded-lg border px-2 py-1 text-xs font-medium cursor-pointer transition-opacity hover:opacity-80',
					colors,
				)}
			>
				<p className="truncate font-semibold leading-tight">{cls.name}</p>
				<p className="truncate text-[10px] opacity-70">
					{formatTime(new Date(cls.startsAt))} —{' '}
					{formatTime(new Date(cls.endsAt))}
				</p>
				<p
					className={cn(
						'text-[10px]',
						isFull ? 'text-danger font-bold' : 'opacity-60',
					)}
				>
					{cls._count.attendances}/{cls.maxCapacity}
					{isFull ? ' · Llena' : ''}
				</p>
			</div>
		);
	}

	function handleEventClick(arg: EventClickArg) {
		const cls = arg.event.extendedProps as Cls;
		if (isAdmin) {
			setSelectedClass(cls);
			setEditModalOpen(true);
		} else if (isTeacher && canViewStudents(cls)) {
			setStudentsModalClass(cls);
		} else if (isStudent) {
			setStudentModalClass(cls);
		}
	}

	const reserveToast = reserveState && reserveState.status !== 'loading' && (
		<div
			className={cn(
				'rounded-xl border px-4 py-3 text-sm font-medium',
				reserveState.status === 'success'
					? 'border-success/20 bg-success/10 text-success'
					: 'border-danger/20 bg-danger/10 text-danger',
			)}
		>
			{reserveState.message}
		</div>
	);

	const cancelToast = cancelState && cancelState.status === 'error' && (
		<div className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
			{cancelState.message}
		</div>
	);

	return (
		<div className="space-y-5">
			{/* Header */}
			<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<div>
					<h1 className="text-dark text-2xl font-bold md:text-3xl">Clases</h1>
					{isStudent && (
						<p className="mt-1 text-sm text-gray-400">
							Toca una clase para ver los detalles y reservar tu lugar.
						</p>
					)}
					{isTeacher && (
						<p className="mt-1 text-sm text-gray-400">
							Toca una clase para ver los estudiantes inscritos y gestionar
							asistencia.
						</p>
					)}
				</div>
				<div className="flex items-center gap-3">
					<div className="flex overflow-hidden rounded-xl border border-gray-200">
						<Button
							onClick={() => {
								if (!isMobile) setView('week');
							}}
							variant={view === 'week' ? 'contained' : 'text'}
							color={view === 'week' ? 'dark' : 'neutral'}
							className={cn(
								'rounded-none px-4 py-2',
								isMobile && 'cursor-not-allowed opacity-40',
								view !== 'week' &&
									'border-transparent text-gray-500 hover:bg-gray-50',
							)}
							title={
								isMobile ? 'Vista de semana disponible en desktop' : undefined
							}
						>
							<span className="flex items-center gap-1.5">
								<Calendar className="h-4 w-4" /> Semana
							</span>
						</Button>
						<Button
							onClick={() => setView('list')}
							variant={view === 'list' ? 'contained' : 'text'}
							color={view === 'list' ? 'dark' : 'neutral'}
							className={cn(
								'rounded-none border-l border-gray-200 px-4 py-2',
								view !== 'list' &&
									'border-transparent text-gray-500 hover:bg-gray-50',
							)}
						>
							<span className="flex items-center gap-1.5">
								<List className="h-4 w-4" /> Lista
							</span>
						</Button>
					</div>
					{isAdmin && (
						<Button
							variant="contained"
							onClick={() => setModal(true)}
							className="rounded-xl px-4"
						>
							+ Nueva Clase
						</Button>
					)}
				</div>
			</div>

			{/* Toasts */}
			{reserveToast}
			{cancelToast}

			{/* Week nav */}
			<div className="flex items-center gap-3">
				<Button
					variant="text"
					color="neutral"
					onClick={prevWeek}
					className="h-auto p-1.5"
				>
					<ChevronLeft className="h-4 w-4 text-gray-500" />
				</Button>
				<p className="text-dark text-sm font-semibold capitalize">
					{weekLabel}
				</p>
				<Button
					variant="text"
					color="neutral"
					onClick={nextWeek}
					className="h-auto p-1.5"
				>
					<ChevronRight className="h-4 w-4 text-gray-500" />
				</Button>
				<Button
					variant="text"
					color="neutral"
					onClick={goToday}
					className="h-auto border border-gray-200 px-3 py-1.5 text-xs hover:bg-gray-50"
				>
					Hoy
				</Button>
			</div>

			{/* Weekly calendar */}
			{view === 'week' && (
				<div className="fc-studio overflow-hidden rounded-2xl border border-gray-50 bg-white shadow-sm">
					{isStudent && (
						<p className="border-b border-gray-50 px-4 py-2 text-xs text-gray-400">
							Haz clic en una clase para ver detalles y reservar.
						</p>
					)}
					{isTeacher && (
						<p className="border-b border-gray-50 px-4 py-2 text-xs text-gray-400">
							Haz clic en una de tus clases para ver los estudiantes inscritos.
						</p>
					)}
					<FullCalendar
						ref={calendarRef}
						plugins={[timeGridPlugin, interactionPlugin]}
						initialView="timeGridWeek"
						locale={esLocale}
						headerToolbar={false}
						allDaySlot={false}
						slotMinTime="07:00:00"
						slotMaxTime="22:00:00"
						slotDuration="01:00:00"
						slotLabelInterval="01:00:00"
						nowIndicator={true}
						slotEventOverlap={false}
						events={fcEvents}
						eventContent={renderEventContent}
						eventClick={handleEventClick}
						initialDate={currentWeek}
						height="auto"
						firstDay={1}
					/>
				</div>
			)}

			{/* List view */}
			{view === 'list' && (
				<>
					{/* Desktop table */}
					<div className="hidden md:block">
						<TableContainer>
							{classes.length === 0 ? (
								<p className="py-12 text-center text-sm text-gray-400">
									Sin clases esta semana
								</p>
							) : (
								<Table>
									<TableHead>
										<TableHeader className="pl-5">Clase</TableHeader>
										<TableHeader>Dia</TableHeader>
										<TableHeader>Horario</TableHeader>
										<TableHeader>Nivel</TableHeader>
										<TableHeader>Asistencia</TableHeader>
										<TableHeader>Acciones</TableHeader>
									</TableHead>
									<TableBody ref={listRef}>
										{listPagination.paginated.map((cls) => {
											const start = new Date(cls.startsAt);
											const end = new Date(cls.endsAt);
											const dayName = new Intl.DateTimeFormat('es-CR', {
												weekday: 'long',
											}).format(start);
											const timeStr = `${formatTime(start)} — ${formatTime(end)}`;
											const isFull = cls._count.attendances >= cls.maxCapacity;
											const isReserving =
												reserveState?.classId === cls.id &&
												reserveState.status === 'loading';
											return (
												<TableRow key={cls.id}>
													<TableCell className="text-dark pl-5 font-medium">
														{cls.name}
													</TableCell>
													<TableCell className="text-gray-600 capitalize">
														{dayName}
													</TableCell>
													<TableCell className="font-mono text-xs text-gray-600">
														{timeStr}
													</TableCell>
													<TableCell>
														<span
															className={cn(
																'rounded-full border px-2 py-0.5 text-xs font-medium',
																LEVEL_COLORS[cls.skillLevel] ??
																	'border-transparent bg-gray-100 text-gray-600',
															)}
														>
															{LEVEL_TRANSLATIONS[cls.skillLevel] ||
																cls.skillLevel}
														</span>
													</TableCell>
													<TableCell
														className={cn(
															'text-gray-600',
															isFull && 'text-danger font-semibold',
														)}
													>
														{cls._count.attendances}/{cls.maxCapacity}
														{isFull && ' · Llena'}
													</TableCell>
													<TableCell>
														{canViewStudents(cls) ? (
															<div className="flex gap-1">
																<Button
																	variant="text"
																	size="sm"
																	onClick={() => setStudentsModalClass(cls)}
																	className="h-8 w-8 p-0"
																	color="neutral"
																	title="Ver inscritos"
																>
																	<Users className="h-4 w-4" />
																</Button>
																{isAdmin && (
																	<>
																		<Button
																			variant="text"
																			size="sm"
																			onClick={() => {
																				setSelectedClass(cls);
																				setEditModalOpen(true);
																			}}
																			className="h-8 w-8 p-0"
																			color="neutral"
																			title="Editar clase"
																		>
																			<Edit className="h-4 w-4" />
																		</Button>
																		<Button
																			variant="text"
																			size="sm"
																			onClick={() => {
																				setSelectedClass(cls);
																				setDeleteModalOpen(true);
																			}}
																			color="neutral"
																			className="h-8 w-8 p-0"
																			title="Eliminar clase"
																		>
																			<Trash2 className="h-4 w-4" />
																		</Button>
																	</>
																)}
															</div>
														) : cls.isEnrolled ? (
															<div className="flex items-center gap-1.5 text-xs font-semibold text-success">
																<BookCheck className="h-3.5 w-3.5" />
																Inscrito
															</div>
														) : (
															<Button
																variant="contained"
																size="sm"
																onClick={() => handleReserve(cls)}
																disabled={isFull || isReserving}
																className="gap-1.5 px-3"
															>
																{isReserving ? (
																	<Spinner
																		size="xs"
																		className="border-white/40 border-t-white"
																	/>
																) : (
																	<BookCheck className="h-3.5 w-3.5" />
																)}
																{isFull ? 'Llena' : 'Reservar'}
															</Button>
														)}
													</TableCell>
												</TableRow>
											);
										})}
									</TableBody>
								</Table>
							)}
							<div className="border-t border-gray-50">
								<Pagination
									page={listPagination.page}
									totalPages={listPagination.totalPages}
									total={listPagination.total}
									pageSize={listPagination.pageSize}
									hasNext={listPagination.hasNext}
									hasPrev={listPagination.hasPrev}
									onNext={listPagination.next}
									onPrev={listPagination.prev}
									onGoTo={listPagination.goTo}
									label="clases"
								/>
							</div>
						</TableContainer>
					</div>

					{/* Mobile cards grouped by day */}
					<div className="space-y-4 md:hidden">
						{classes.length === 0 ? (
							<p className="py-12 text-center text-sm text-gray-400">
								Sin clases esta semana
							</p>
						) : (
							(() => {
								const grouped = listPagination.paginated.reduce<
									Record<string, typeof classes>
								>((acc, cls) => {
									const d = new Date(cls.startsAt);
									const key = d.toDateString();
									if (!acc[key]) acc[key] = [];
									acc[key].push(cls);
									return acc;
								}, {});
								const todayStr = new Date().toDateString();
								return Object.entries(grouped).map(([dateStr, dayClasses]) => {
									const d = new Date(dateStr);
									const isToday = dateStr === todayStr;
									const label = `${isToday ? 'HOY — ' : ''}${new Intl.DateTimeFormat('es-CR', { weekday: 'long', day: 'numeric', month: 'short' }).format(d)}`;
									return (
										<div key={dateStr}>
											<p className="mb-2 text-xs font-bold tracking-wide text-gray-400 uppercase">
												{label}
											</p>
											<div className="space-y-2">
												{dayClasses.map((cls) => {
													const start = new Date(cls.startsAt);
													const end = new Date(cls.endsAt);
													const timeStr = `${formatTime(start)} — ${formatTime(end)}`;
													const levelColor = LEVEL_COLORS[cls.skillLevel];
													const borderColor = levelColor?.includes('success')
														? 'border-l-green-500'
														: levelColor?.includes('primary')
															? 'border-l-blue-500'
															: levelColor?.includes('warning')
																? 'border-l-amber-500'
																: 'border-l-gray-400';
													const isFull =
														cls._count.attendances >= cls.maxCapacity;
													const isReserving =
														reserveState?.classId === cls.id &&
														reserveState.status === 'loading';
													return (
														<div
															key={cls.id}
															className={cn(
																'rounded-xl border-l-4 bg-white p-4 shadow-sm',
																borderColor,
															)}
														>
															<div className="mb-1 flex items-center gap-2">
																<span className="rounded-full bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-500">
																	{timeStr}
																</span>
																<span className="text-dark text-sm font-bold">
																	{cls.name}
																</span>
															</div>
															<p
																className={cn(
																	'mb-3 text-xs',
																	isFull
																		? 'text-danger font-semibold'
																		: 'text-gray-400',
																)}
															>
																Cupos: {cls._count.attendances}/
																{cls.maxCapacity}
																{isFull ? ' · Llena' : ''}
															</p>
															{canViewStudents(cls) ? (
																<div className="flex flex-col gap-2">
																	<Button
																		variant="text"
																		onClick={() => setStudentsModalClass(cls)}
																		className="h-auto w-full justify-center rounded-lg border border-gray-100 py-2 text-xs font-semibold"
																	>
																		<Users className="mr-1 h-3 w-3" />
																		Ver inscritos ({cls._count.attendances})
																	</Button>
																	{isAdmin && (
																		<div className="flex gap-2">
																			<Button
																				variant="text"
																				onClick={() => {
																					setSelectedClass(cls);
																					setEditModalOpen(true);
																				}}
																				className="h-auto flex-1 justify-center rounded-lg border border-gray-100 py-2 text-xs font-semibold"
																			>
																				<Edit className="mr-1 h-3 w-3" />
																				Editar
																			</Button>
																			<Button
																				variant="text"
																				onClick={() => {
																					setSelectedClass(cls);
																					setDeleteModalOpen(true);
																				}}
																				className="h-auto flex-1 justify-center rounded-lg border border-gray-100 py-2 text-xs font-semibold"
																			>
																				<Trash2 className="mr-1 h-3 w-3" />
																				Eliminar
																			</Button>
																		</div>
																	)}
																</div>
															) : cls.isEnrolled ? (
																<div className="space-y-2">
																	<div className="flex items-center justify-center gap-2 rounded-xl bg-success/10 px-4 py-2.5 text-sm font-semibold text-success">
																		<BookCheck className="h-4 w-4" />
																		Ya estás inscrito
																	</div>
																	<Button
																		variant="outlined"
																		color="danger"
																		onClick={() => handleCancel(cls)}
																		disabled={
																			cancelState?.classId === cls.id &&
																			cancelState.status === 'loading'
																		}
																		className="w-full text-xs"
																	>
																		Cancelar inscripción
																	</Button>
																</div>
															) : (
																<Button
																	variant="contained"
																	onClick={() => handleReserve(cls)}
																	disabled={isFull || isReserving}
																	className="w-full gap-1.5"
																>
																	{isReserving ? (
																		<Spinner
																			size="xs"
																			className="border-white/40 border-t-white"
																		/>
																	) : (
																		<BookCheck className="h-4 w-4" />
																	)}
																	{isFull ? 'Clase llena' : 'Reservar lugar'}
																</Button>
															)}
														</div>
													);
												})}
											</div>
										</div>
									);
								});
							})()
						)}
						<div className="mt-4 rounded-xl bg-white shadow-sm">
							<Pagination
								page={listPagination.page}
								totalPages={listPagination.totalPages}
								total={listPagination.total}
								pageSize={listPagination.pageSize}
								hasNext={listPagination.hasNext}
								hasPrev={listPagination.hasPrev}
								onNext={listPagination.next}
								onPrev={listPagination.prev}
								onGoTo={listPagination.goTo}
								label="clases"
							/>
						</div>
					</div>
				</>
			)}

			<AnimatePresence>
				{modalOpen && isAdmin && (
					<NewClassModal
						key="new-class-modal"
						teachers={teachers}
						weekStart={currentWeek}
						role={role}
						userId={userId}
						onClose={() => setModal(false)}
					/>
				)}
				{editModalOpen && selectedClass && isAdmin && (
					<EditClassModal
						key="edit-class-modal"
						classData={selectedClass}
						teachers={teachers}
						role={role}
						onClose={() => {
							setEditModalOpen(false);
							setSelectedClass(null);
						}}
					/>
				)}
				{deleteModalOpen && selectedClass && isAdmin && (
					<DeleteClassModal
						key="delete-class-modal"
						classData={selectedClass}
						onClose={() => {
							setDeleteModalOpen(false);
							setSelectedClass(null);
						}}
					/>
				)}
				{studentModalClass && isStudent && (
					<StudentClassModal
						key="student-class-modal"
						cls={studentModalClass}
						isReserving={
							reserveState?.classId === studentModalClass.id &&
							reserveState.status === 'loading'
						}
						isCancelling={
							cancelState?.classId === studentModalClass.id &&
							cancelState.status === 'loading'
						}
						onReserve={() => handleReserve(studentModalClass)}
						onCancel={() => handleCancel(studentModalClass)}
						onClose={() => setStudentModalClass(null)}
					/>
				)}
				{studentsModalClass && (
					<ClassStudentsModal
						key="class-students-modal"
						cls={studentsModalClass}
						onClose={() => setStudentsModalClass(null)}
					/>
				)}
			</AnimatePresence>
		</div>
	);
}
