import { Calendar, Clock, CreditCard, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';

import { cn } from '@/lib/cn';
import { formatDate, formatPrice, formatTime, greeting } from '@/utils/general';

type UpcomingClass = {
	id: string;
	name: string;
	startsAt: string;
	endsAt: string;
	skillLevel: string;
};

type ActiveOrder = {
	id: string;
	planName: string;
	status: string;
	creditsRemaining: number;
	expiresAt: string | null;
};

type RecentPayment = {
	id: string;
	planName: string;
	status: string;
	createdAt: string;
	price: number;
};

export type StudentDashboardProps = {
	userName: string;
	creditBalance: number;
	activeOrder: ActiveOrder | null;
	upcomingClasses: UpcomingClass[];
	recentPayments: RecentPayment[];
};

function formatShortDate(dateStr: string) {
	return new Intl.DateTimeFormat('es-CR', {
		day: 'numeric',
		month: 'short',
	}).format(new Date(dateStr));
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
	PENDING_REVIEW: {
		label: 'Pendiente',
		className: 'bg-warning/10 text-warning',
	},
	ACTIVE: {
		label: 'Aprobado',
		className: 'bg-success/10 text-success',
	},
	REJECTED: {
		label: 'Rechazado',
		className: 'bg-danger/10 text-danger',
	},
	EXPIRED: {
		label: 'Expirado',
		className: 'bg-gray-100 text-gray-500',
	},
	CANCELLED: {
		label: 'Cancelado',
		className: 'bg-gray-100 text-gray-500',
	},
};

const SKILL_LABELS: Record<string, string> = {
	BEGINNER: 'Principiante',
	INTERMEDIATE: 'Intermedio',
	ADVANCED: 'Avanzado',
	MASTER: 'Maestro',
};

export function StudentDashboard({
	userName,
	creditBalance,
	activeOrder,
	upcomingClasses,
	recentPayments,
}: StudentDashboardProps) {
	const now = new Date();

	return (
		<div className="space-y-8">
			{/* Header */}
			<div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
				<h1 className="text-dark text-2xl font-bold md:text-[28px]">
					{greeting()}, {userName.split(' ')[0]} 👋
				</h1>
				<p className="text-sm text-gray-400 capitalize">{formatDate(now)}</p>
			</div>

			{/* KPI Cards */}
			<div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5">
				{/* Credit Balance */}
				<div className="rounded-2xl border border-gray-50 bg-white p-4 shadow-sm md:p-5">
					<div className="mb-2 flex items-start justify-between md:mb-3">
						<p className="text-xs text-gray-400 md:text-sm">
							Creditos Disponibles
						</p>
						<CreditCard className="h-4 w-4 text-gray-300 md:h-5 md:w-5" />
					</div>
					<p
						className={cn(
							'text-2xl font-bold md:text-4xl mb-1',
							creditBalance > 0 ? 'text-dark' : 'text-danger',
						)}
					>
						{creditBalance}
					</p>
					<p className="text-xs font-medium text-gray-400">
						{creditBalance > 0 ? 'creditos para reservar' : 'sin creditos'}
					</p>
				</div>

				{/* Active Plan */}
				<div className="rounded-2xl border border-gray-50 bg-white p-4 shadow-sm md:p-5">
					<div className="mb-2 flex items-start justify-between md:mb-3">
						<p className="text-xs text-gray-400 md:text-sm">Plan Activo</p>
						<Tag className="h-4 w-4 text-gray-300 md:h-5 md:w-5" />
					</div>
					{activeOrder ? (
						<>
							<p className="text-dark text-lg font-bold md:text-xl mb-1">
								{activeOrder.planName}
							</p>
							<p className="text-xs font-medium text-success">
								{activeOrder.expiresAt
									? `Vence ${formatShortDate(activeOrder.expiresAt)}`
									: 'Activo'}
							</p>
						</>
					) : (
						<>
							<p className="text-gray-300 text-lg font-bold md:text-xl mb-1">
								—
							</p>
							<Link
								to="/plans"
								className="text-primary text-xs font-semibold hover:underline"
							>
								Ver planes →
							</Link>
						</>
					)}
				</div>

				{/* Upcoming Classes */}
				<div className="col-span-2 rounded-2xl border border-gray-50 bg-white p-4 shadow-sm md:col-span-1 md:p-5">
					<div className="mb-2 flex items-start justify-between md:mb-3">
						<p className="text-xs text-gray-400 md:text-sm">Proximas Clases</p>
						<Calendar className="h-4 w-4 text-gray-300 md:h-5 md:w-5" />
					</div>
					<p className="text-dark text-2xl font-bold md:text-4xl mb-1">
						{upcomingClasses.length}
					</p>
					<Link
						to="/classes"
						className="text-primary text-xs font-semibold hover:underline"
					>
						Ver calendario →
					</Link>
				</div>
			</div>

			{/* Main content */}
			<div className="flex flex-col gap-4 md:grid lg:grid-cols-[1fr_340px] lg:gap-6">
				{/* Upcoming classes list */}
				<div className="rounded-2xl border border-gray-50 bg-white p-4 shadow-sm md:p-6">
					<div className="mb-5 flex items-center justify-between">
						<h2 className="text-dark text-base font-bold">
							Mis Proximas Clases
						</h2>
						<Link
							to="/classes"
							className="text-primary text-sm font-semibold hover:underline"
						>
							Ver todas →
						</Link>
					</div>

					{upcomingClasses.length === 0 ? (
						<div className="py-8 text-center">
							<Calendar className="mx-auto mb-3 h-10 w-10 text-gray-200" />
							<p className="text-sm text-gray-400">
								No tienes clases reservadas
							</p>
							<Link
								to="/classes"
								className="text-primary mt-2 inline-block text-sm font-semibold hover:underline"
							>
								Explorar clases →
							</Link>
						</div>
					) : (
						<div className="space-y-2.5">
							{upcomingClasses.map((cls) => (
								<div
									key={cls.id}
									className="flex items-center gap-3 rounded-xl bg-gray-50 p-3"
								>
									<div className="flex w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-white px-1 py-1.5 shadow-sm">
										<span className="text-dark text-[11px] font-bold uppercase leading-none">
											{new Intl.DateTimeFormat('es-CR', { weekday: 'short' })
												.format(new Date(cls.startsAt))
												.replace('.', '')}
										</span>
										<span className="mt-0.5 text-[10px] text-gray-400">
											{formatTime(new Date(cls.startsAt))}
										</span>
									</div>
									<div className="min-w-0 flex-1">
										<p className="text-dark truncate text-sm font-medium">
											{cls.name}
										</p>
										<div className="flex items-center gap-2 text-xs text-gray-400">
											<Clock className="h-3 w-3" />
											{formatTime(new Date(cls.startsAt))} —{' '}
											{formatTime(new Date(cls.endsAt))}
										</div>
									</div>
									<span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
										{SKILL_LABELS[cls.skillLevel] ?? cls.skillLevel}
									</span>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Recent payments */}
				<div className="rounded-2xl border border-gray-50 bg-white p-5 shadow-sm">
					<div className="mb-4 flex items-center justify-between">
						<h2 className="text-dark text-base font-bold">Mis Pagos</h2>
						<Link
							to="/payments"
							className="text-primary text-sm font-semibold hover:underline"
						>
							Ver todos →
						</Link>
					</div>

					{recentPayments.length === 0 ? (
						<p className="py-4 text-center text-sm text-gray-400">
							Sin pagos registrados
						</p>
					) : (
						<div className="space-y-3">
							{recentPayments.map((payment) => {
								const statusInfo = STATUS_LABELS[payment.status] ?? {
									label: payment.status,
									className: 'bg-gray-100 text-gray-500',
								};
								return (
									<div key={payment.id} className="flex items-center gap-3">
										<div className="bg-dark flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
											<CreditCard className="h-4 w-4 text-white" />
										</div>
										<div className="min-w-0 flex-1">
											<p className="text-dark truncate text-sm font-medium">
												{payment.planName}
											</p>
											<p className="text-xs text-gray-400">
												{formatPrice(payment.price)}
											</p>
										</div>
										<div className="flex flex-col items-end gap-0.5">
											<span
												className={cn(
													'rounded-full px-2 py-0.5 text-[10px] font-medium',
													statusInfo.className,
												)}
											>
												{statusInfo.label}
											</span>
											<span className="text-[10px] text-gray-400">
												{formatShortDate(payment.createdAt)}
											</span>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
