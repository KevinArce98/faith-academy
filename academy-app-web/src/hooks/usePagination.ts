import { useMemo, useState } from 'react';

type UsePaginationOptions = {
	pageSize?: number;
};

export function usePagination<T>(
	items: T[],
	{ pageSize = 10 }: UsePaginationOptions = {},
) {
	const [page, setPage] = useState(1);

	const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
	const safePage = Math.min(page, totalPages);

	const paginated = useMemo(() => {
		const start = (safePage - 1) * pageSize;
		return items.slice(start, start + pageSize);
	}, [items, safePage, pageSize]);

	function goTo(p: number) {
		setPage(Math.max(1, Math.min(p, totalPages)));
	}

	return {
		page: safePage,
		totalPages,
		pageSize,
		total: items.length,
		paginated,
		goTo,
		next: () => goTo(safePage + 1),
		prev: () => goTo(safePage - 1),
		reset: () => setPage(1),
		hasNext: safePage < totalPages,
		hasPrev: safePage > 1,
	};
}
