import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export type DataTableUrlSort = {
  column: string;
  direction: 'asc' | 'desc';
};

const pageSizes = [10, 25, 50, 100] as const;

function isPageSize(value: number): value is (typeof pageSizes)[number] {
  return pageSizes.some((size) => size === value);
}

export function useDataTableUrlState({
  tableId = 'table',
  defaultPageSize = 25,
}: {
  tableId?: string;
  defaultPageSize?: number;
} = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const prefix = tableId;
  const pageParam = `${prefix}.page`;
  const pageSizeParam = `${prefix}.pageSize`;
  const searchParam = `${prefix}.q`;
  const sortByParam = `${prefix}.sortBy`;
  const sortDirectionParam = `${prefix}.sortDirection`;
  const pageValue = Number(searchParams.get(pageParam));
  const page = Number.isSafeInteger(pageValue) && pageValue > 0 ? pageValue : 1;
  const requestedPageSize = Number(searchParams.get(pageSizeParam));
  const safeDefaultPageSize = isPageSize(defaultPageSize)
    ? defaultPageSize
    : 25;
  const pageSize = isPageSize(requestedPageSize)
    ? requestedPageSize
    : safeDefaultPageSize;
  const searchValue = searchParams.get(searchParam) ?? '';
  const sortColumn = searchParams.get(sortByParam);
  const sortDirection = searchParams.get(sortDirectionParam);
  const sort = sortColumn && (sortDirection === 'asc' || sortDirection === 'desc')
    ? { column: sortColumn, direction: sortDirection } satisfies DataTableUrlSort
    : undefined;
  const filterPrefix = `${prefix}.filter.`;
  const filterValues = Object.fromEntries(
    [...searchParams.keys()]
      .filter((key) => key.startsWith(filterPrefix))
      .map((key) => [
        key.slice(filterPrefix.length),
        [...new Set(searchParams.getAll(key))],
      ]),
  );

  const updateParams = useCallback((update: (params: URLSearchParams) => void, replace = false) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      update(next);
      return next;
    }, { replace });
  }, [setSearchParams]);

  const onPageChange = useCallback((nextPage: number) => {
    updateParams((params) => {
      if (!Number.isSafeInteger(nextPage) || nextPage <= 1) params.delete(pageParam);
      else params.set(pageParam, String(nextPage));
    });
  }, [pageParam, updateParams]);

  const onPageSizeChange = useCallback((nextPageSize: number) => {
    updateParams((params) => {
      if (isPageSize(nextPageSize)) {
        if (nextPageSize === safeDefaultPageSize) params.delete(pageSizeParam);
        else params.set(pageSizeParam, String(nextPageSize));
      }
      params.delete(pageParam);
    });
  }, [pageParam, pageSizeParam, safeDefaultPageSize, updateParams]);

  const onSearchChange = useCallback((value: string) => {
    updateParams((params) => {
      if (value) params.set(searchParam, value);
      else params.delete(searchParam);
      params.delete(pageParam);
    }, true);
  }, [pageParam, searchParam, updateParams]);

  const onSortChange = useCallback((value: DataTableUrlSort) => {
    updateParams((params) => {
      params.set(sortByParam, value.column);
      params.set(sortDirectionParam, value.direction);
      params.delete(pageParam);
    });
  }, [pageParam, sortByParam, sortDirectionParam, updateParams]);

  const onFilterValuesChange = useCallback((values: Record<string, string[]>) => {
    updateParams((params) => {
      for (const key of params.keys()) {
        if (key.startsWith(filterPrefix)) params.delete(key);
      }
      for (const [id, selectedValues] of Object.entries(values)) {
        const key = `${filterPrefix}${id}`;
        for (const value of new Set(selectedValues)) params.append(key, value);
      }
      params.delete(pageParam);
    });
  }, [filterPrefix, pageParam, updateParams]);

  return {
    page,
    pageSize,
    searchValue,
    sort,
    filterValues,
    onPageChange,
    onPageSizeChange,
    onSearchChange,
    onSortChange,
    onFilterValuesChange,
  };
}
