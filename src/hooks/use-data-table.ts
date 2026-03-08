import { useState, useMemo } from "react";

type SortDirection = "asc" | "desc";

interface SortConfig {
  key: string;
  direction: SortDirection;
}

interface UseDataTableOptions {
  pageSize?: number;
  defaultSort?: SortConfig;
}

export function useDataTable<T extends Record<string, any>>(
  data: T[],
  options: UseDataTableOptions = {}
) {
  const { pageSize = 25, defaultSort } = options;
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortConfig | null>(defaultSort ?? null);

  const sorted = useMemo(() => {
    if (!sort) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sort.key];
      const bVal = b[sort.key];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sort.direction === "asc" ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      if (aStr < bStr) return sort.direction === "asc" ? -1 : 1;
      if (aStr > bStr) return sort.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedData = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const toggleSort = (key: string) => {
    setSort((prev) => {
      if (prev?.key === key) {
        return prev.direction === "asc" ? { key, direction: "desc" } : null;
      }
      return { key, direction: "asc" };
    });
    setPage(1);
  };

  const getSortDirection = (key: string): SortDirection | null => {
    if (sort?.key === key) return sort.direction;
    return null;
  };

  return {
    pageData: paginatedData,
    page: safePage,
    totalPages,
    totalItems: sorted.length,
    setPage,
    toggleSort,
    getSortDirection,
    pageSize,
  };
}
