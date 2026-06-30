import { AlertTriangle, CalendarCheck, Tag, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { formatDate, formatPrice, greeting } from '@/utils/general';

export type StudentDashboardProps = {
	userName: string;
	enrollmentFee: number | null;
	subscription: { planName: string; amount: number; isPaid: boolean } | null;
	planActive: boolean;
	planExpired: boolean;
	expiresAt: string | null;
	classesThisMonth: { id: string; name: string }[];
};

function formatExpiry(iso: string | null): string {
	if (!iso) return '';
	return new Date(iso).toLocaleDateString('es-CR', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	});
}

export function StudentDashboard({
	userName,
	enrollmentFee,
	subscription,
	planActive,
	planExpired,
	expiresAt,
	classesThisMonth,
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

			{/* Aviso de plan vencido */}
			{planExpired && (
				<div className="border-danger/20 bg-danger/5 flex flex-col gap-2 rounded-2xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="text-danger flex items-start gap-2 text-sm font-medium">
						<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
						<span>
							Tu plan venció el {formatExpiry(expiresAt)}. Renueva tu
							mensualidad para seguir inscribiéndote en clases.
						</span>
					</div>
					<Link to="/payments" className="shrink-0">
						<Button
							variant="contained"
							color="primary"
							className="h-9 w-full rounded-lg text-sm sm:w-auto"
						>
							Renovar plan
						</Button>
					</Link>
				</div>
			)}

			{/* KPI Cards */}
			<div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5">
				{/* Plan / mensualidad */}
				<div className="rounded-2xl border border-gray-50 bg-white p-4 shadow-sm md:p-5">
					<div className="mb-2 flex items-start justify-between md:mb-3">
						<p className="text-xs text-gray-400 md:text-sm">Mi Plan</p>
						<Tag className="h-4 w-4 text-gray-300 md:h-5 md:w-5" />
					</div>
					{subscription ? (
						<>
							<p className="text-dark mb-1 text-lg font-bold md:text-xl">
								{subscription.planName}
							</p>
							<p className="text-xs font-medium text-gray-400">
								{formatPrice(subscription.amount)} / mes
							</p>
						</>
					) : (
						<>
							<p className="mb-1 text-lg font-bold text-gray-300 md:text-xl">
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

				{/* Estado del plan */}
				<div className="rounded-2xl border border-gray-50 bg-white p-4 shadow-sm md:p-5">
					<div className="mb-2 flex items-start justify-between md:mb-3">
						<p className="text-xs text-gray-400 md:text-sm">Estado del Plan</p>
						<Wallet className="h-4 w-4 text-gray-300 md:h-5 md:w-5" />
					</div>
					<p
						className={cn(
							'mb-1 text-lg font-bold md:text-xl',
							planActive
								? 'text-success'
								: planExpired
									? 'text-danger'
									: 'text-warning',
						)}
					>
						{planActive ? 'Activo' : planExpired ? 'Vencido' : 'Pendiente'}
					</p>
					{planActive && expiresAt ? (
						<p className="text-xs font-medium text-gray-400">
							Vence el {formatExpiry(expiresAt)}
						</p>
					) : enrollmentFee != null ? (
						<p className="text-xs font-medium text-gray-400">
							Matrícula {formatPrice(enrollmentFee)}
						</p>
					) : null}
				</div>

				{/* Clases este mes */}
				<div className="col-span-2 rounded-2xl border border-gray-50 bg-white p-4 shadow-sm md:col-span-1 md:p-5">
					<div className="mb-2 flex items-start justify-between md:mb-3">
						<p className="text-xs text-gray-400 md:text-sm">Clases este Mes</p>
						<CalendarCheck className="h-4 w-4 text-gray-300 md:h-5 md:w-5" />
					</div>
					<p className="text-dark mb-1 text-2xl font-bold md:text-4xl">
						{classesThisMonth.length}
					</p>
					<p className="text-xs font-medium text-gray-400">clases inscritas</p>
				</div>
			</div>

			{/* Classes attended this month */}
			<div className="rounded-2xl border border-gray-50 bg-white p-4 shadow-sm md:p-6">
				<h2 className="text-dark mb-4 text-base font-bold">
					Mis Clases este Mes
				</h2>
				{classesThisMonth.length === 0 ? (
					<p className="py-8 text-center text-sm text-gray-400">
						Aún no estás inscrito en clases este mes
					</p>
				) : (
					<div className="flex flex-wrap gap-2">
						{classesThisMonth.map((cls) => (
							<span
								key={cls.id}
								className="bg-primary/10 text-primary rounded-full px-3 py-1.5 text-sm font-medium"
							>
								{cls.name}
							</span>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
