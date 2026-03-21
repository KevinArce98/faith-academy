import { useState, useMemo } from 'react';

type UsePaginationOptions = {
  pageSize?: number;
};

export function usePagination<T>(
  items: T[],
  { pageSize = 10 }: UsePaginationOptions = {}
) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  // Reset to page 1 when items change and current page exceeds total
  const safePage = Math.min(page, totalPages);

  const paginated = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  function goTo(p: number) {
    setPage(Math.max(1, Math.min(p, totalPages)));
  }

  function next() {
    goTo(safePage + 1);
  }

  function prev() {
    goTo(safePage - 1);
  }

  function reset() {
    setPage(1);
  }

  return {
    page: safePage,
    totalPages,
    pageSize,
    total: items.length,
    paginated,
    goTo,
    next,
    prev,
    reset,
    hasNext: safePage < totalPages,
    hasPrev: safePage > 1,
  };
}
