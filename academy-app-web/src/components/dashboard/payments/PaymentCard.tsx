import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { useApiClient } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatPrice, getInitials, timeAgo } from '@/utils/general';

import { ReceiptModal } from './ReceiptModal';
import type { Order } from './payments.types';

type PaymentCardProps = {
	order: Order;
	isAdmin?: boolean;
};

export function PaymentCard({ order, isAdmin = false }: PaymentCardProps) {
	const apiClient = useApiClient();
	const queryClient = useQueryClient();
	const [isPending, setIsPending] = useState(false);
	const [status, setStatus] = useState(order.status);
	const [approvedAt, setApprovedAt] = useState<Date | string | null>(
		order.approvedAt,
	);
	const [receiptOpen, setReceiptOpen] = useState(false);

	const approved = status === 'ACTIVE';
	const rejected = status === 'REJECTED';
	const statusDate =
		approved || rejected ? (approvedAt ?? order.createdAt) : order.createdAt;

	const handleApprove = async () => {
		await apiClient(`/api/v1/payments/orders/${order.id}/approve`, {
			method: 'POST',
		});
		setStatus('ACTIVE');
		setApprovedAt(new Date());
		queryClient.invalidateQueries({ queryKey: ['payments'] });
	};

	const handleReject = async () => {
		await apiClient(`/api/v1/payments/orders/${order.id}/reject`, {
			method: 'POST',
			body: JSON.stringify({ notes: '' }),
		});
		setStatus('REJECTED');
		setApprovedAt(new Date());
		queryClient.invalidateQueries({ queryKey: ['payments'] });
	};

	return (
		<>
			<div
				className={cn(
					'rounded-2xl border-2 bg-white p-5 shadow-sm transition-colors',
					approved ? 'border-success/30' : 'border-gray-50',
				)}
			>
				<div className="mb-3 flex items-start justify-between">
					<div className="flex items-center gap-3">
						{order.student && (
							<div className="bg-dark flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
								<span className="text-sm font-bold text-white">
									{getInitials(order.student.name)}
								</span>
							</div>
						)}
						<div>
							{order.student && (
								<p className="text-dark text-sm font-semibold">
									{order.student.name}
								</p>
							)}
							<span
								className={cn(
									'rounded-full px-2 py-0.5 text-xs font-medium',
									order.plan.name.toLowerCase().includes('vip')
										? 'bg-primary text-white'
										: order.plan.name.toLowerCase().includes('pro')
											? 'bg-dark text-white'
											: 'bg-gray-100 text-gray-600',
								)}
							>
								{order.plan.name}
							</span>
						</div>
					</div>
					<span className="text-xs text-gray-400">{timeAgo(statusDate)}</span>
				</div>

				<p className="text-dark mb-3 text-sm">
					Plan mensual — {formatPrice(order.plan.price)}
				</p>

				<div
					className="hover:border-primary/30 mb-2 flex h-24 cursor-pointer items-center justify-center rounded-xl border border-gray-100 bg-gray-50 transition-colors"
					onClick={() => setReceiptOpen(true)}
				>
					{order.receiptUrl ? (
						<img
							src={order.receiptUrl}
							alt="Comprobante"
							className="h-full w-full rounded-xl object-cover"
						/>
					) : (
						<div className="flex flex-col items-center gap-1 text-gray-300">
							<svg
								className="h-8 w-8"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								strokeWidth={1}
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
								/>
							</svg>
						</div>
					)}
				</div>
				<Button
					variant="text"
					color="primary"
					onClick={() => setReceiptOpen(true)}
					className="mb-3 h-auto p-0 text-xs hover:bg-transparent hover:underline"
				>
					Ver comprobante completo
				</Button>

				{approved ? (
					<div className="bg-success/5 border-success/20 text-success flex items-center gap-2 rounded-xl border px-4 py-3 text-sm">
						<Check className="h-4 w-4" />
						<div>
							<p className="font-semibold">Aprobado — {timeAgo(statusDate)}</p>
							{order.creditGranted && order.expiresAt && (
								<p className="text-xs text-gray-500">
									{order.creditGranted} créditos activados · Vence{' '}
									{new Intl.DateTimeFormat('es-CR', {
										day: 'numeric',
										month: 'short',
										year: 'numeric',
									}).format(new Date(order.expiresAt))}
								</p>
							)}
						</div>
					</div>
				) : rejected ? (
					<div className="bg-danger/5 border-danger/20 text-danger rounded-xl border px-4 py-3 text-center text-sm font-semibold">
						Rechazado
					</div>
				) : isAdmin ? (
					<div className="grid grid-cols-2 gap-3">
						<Button
							variant="contained"
							color="success"
							onClick={async () => {
								setIsPending(true);
								try {
									await handleApprove();
								} finally {
									setIsPending(false);
								}
							}}
							disabled={isPending}
							className="h-11 gap-1.5 rounded-xl"
						>
							<Check className="h-4 w-4" /> Aprobar
						</Button>
						<Button
							variant="outlined"
							color="danger"
							onClick={async () => {
								setIsPending(true);
								try {
									await handleReject();
								} finally {
									setIsPending(false);
								}
							}}
							disabled={isPending}
							className="h-11 gap-1.5 rounded-xl"
						>
							<X className="h-4 w-4" /> Rechazar
						</Button>
					</div>
				) : (
					<div className="bg-warning/10 text-warning border-warning/20 rounded-xl border px-4 py-3 text-center text-sm font-semibold">
						Pendiente de revision
					</div>
				)}
			</div>

			<AnimatePresence>
				{receiptOpen && (
					<ReceiptModal
						url={order.receiptUrl ?? ''}
						student={order.student}
						plan={order.plan}
						price={order.plan.price}
						status={status}
						onClose={() => setReceiptOpen(false)}
						onApprove={handleApprove}
						onReject={handleReject}
						isAdmin={isAdmin}
					/>
				)}
			</AnimatePresence>
		</>
	);
}
