import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

type PaginationProps = {
	page: number;
	totalPages: number;
	total: number;
	pageSize: number;
	hasNext: boolean;
	hasPrev: boolean;
	onNext: () => void;
	onPrev: () => void;
	onGoTo: (page: number) => void;
	label?: string;
};

function getPageNumbers(current: number, total: number): (number | '...')[] {
	if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

	const pages: (number | '...')[] = [1];

	if (current > 3) pages.push('...');

	const start = Math.max(2, current - 1);
	const end = Math.min(total - 1, current + 1);

	for (let i = start; i <= end; i++) pages.push(i);

	if (current < total - 2) pages.push('...');

	pages.push(total);

	return pages;
}

export function Pagination({
	page,
	totalPages,
	total,
	pageSize,
	hasNext,
	hasPrev,
	onNext,
	onPrev,
	onGoTo,
	label = 'elementos',
}: PaginationProps) {
	if (totalPages <= 1) return null;

	const from = (page - 1) * pageSize + 1;
	const to = Math.min(page * pageSize, total);
	const pages = getPageNumbers(page, totalPages);

	return (
		<div className="flex items-center justify-between px-5 py-4">
			<p className="text-xs text-gray-400">
				Mostrando {from}-{to} de {total} {label}
			</p>
			<div className="flex items-center gap-1">
				<Button
					variant="text"
					color="neutral"
					className="h-7 w-7 p-0 text-gray-400 hover:bg-gray-50"
					onClick={onPrev}
					disabled={!hasPrev}
				>
					<ChevronLeft className="h-4 w-4" />
				</Button>
				{pages.map((p, i) =>
					p === '...' ? (
						<span key={`dots-${i}`} className="px-1 text-xs text-gray-300">
							…
						</span>
					) : (
						<Button
							key={p}
							variant={p === page ? 'contained' : 'text'}
							color={p === page ? 'primary' : 'neutral'}
							className={cn(
								'h-7 w-7 p-0 text-xs',
								p !== page && 'text-gray-400 hover:bg-gray-50',
							)}
							onClick={() => onGoTo(p)}
						>
							{p}
						</Button>
					),
				)}
				<Button
					variant="text"
					color="neutral"
					className="h-7 w-7 p-0 text-gray-400 hover:bg-gray-50"
					onClick={onNext}
					disabled={!hasNext}
				>
					<ChevronRight className="h-4 w-4" />
				</Button>
			</div>
		</div>
	);
}
