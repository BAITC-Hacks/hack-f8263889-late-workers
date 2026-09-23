import { useState } from "react";

import type { SortOrder, UsersSort } from "../api/users";
import {
  SEARCH_DEBOUNCE_MS,
  type StatusFilter,
  nextSort,
  toListParams,
} from "../helpers";
import { useDebouncedValue } from "./useDebouncedValue";

/**
 * Search / filter / sort state for the users list. The raw `q` drives the input,
 * the debounced one drives the request; changing any filter rewinds to page 1.
 */
export const useUsersQueryState = () => {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<UsersSort | null>(null);
  const [order, setOrder] = useState<SortOrder>("asc");

  const debouncedQ = useDebouncedValue(q, SEARCH_DEBOUNCE_MS);

  const changeQ = (value: string) => {
    setQ(value);
    setPage(1);
  };

  const changeStatus = (value: StatusFilter) => {
    setStatus(value);
    setPage(1);
  };

  const toggleSort = (field: UsersSort) => {
    const next = nextSort({ sort, order }, field);
    setSort(next.sort);
    setOrder(next.order);
    setPage(1);
  };

  return {
    page,
    q,
    status,
    sort,
    order,
    params: toListParams({ page, q: debouncedQ, status, sort, order }),
    changePage: setPage,
    changeQ,
    changeStatus,
    toggleSort,
  };
};
