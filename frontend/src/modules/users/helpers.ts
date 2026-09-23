import { parseApiDate } from "@/core/api";

import type {
  Gender,
  SortOrder,
  UserStatus,
  UsersQuery,
  UsersSort,
} from "./api/users";

/** The contract's page size; also what the pagination counts with. */
export const USERS_PAGE_SIZE = 20;

export const SEARCH_DEBOUNCE_MS = 300;

/** "Any status" is a UI-only value — the contract expresses it by omitting `status`. */
export type StatusFilter = UserStatus | "all";

export type UsersQueryState = {
  page: number;
  q: string;
  status: StatusFilter;
  sort: UsersSort | null;
  order: SortOrder;
};

export const toListParams = (state: UsersQueryState): UsersQuery => {
  const params: UsersQuery = { page: state.page, limit: USERS_PAGE_SIZE };
  const q = state.q.trim();
  if (q) params.q = q;
  if (state.status !== "all") params.status = state.status;
  if (state.sort) {
    params.sort = state.sort;
    params.order = state.order;
  }
  return params;
};

/** First click on a column sorts ascending; clicking the active one flips the order. */
export const nextSort = (
  current: Pick<UsersQueryState, "sort" | "order">,
  field: UsersSort
): { sort: UsersSort; order: SortOrder } => ({
  sort: field,
  order: current.sort === field && current.order === "asc" ? "desc" : "asc",
});

/** Fixed ДД.ММ.ГГГГ — deliberately not locale-dependent. */
export const formatCreatedAt = (iso: string): string => {
  const date = parseApiDate(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
};

export const genderLabelKey = (gender: Gender) => `users.gender.${gender}`;

export const statusLabelKey = (status: UserStatus) => `users.status.${status}`;

export const pageNumbers = (total: number, limit: number): number[] =>
  Array.from({ length: Math.ceil(total / limit) }, (_, index) => index + 1);
