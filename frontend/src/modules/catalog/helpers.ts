import type { BadgeProps } from "@/common/components/ui";
import { formatDateTime, isApiError } from "@/core/api";

import {
  TASK_LEVELS,
  TASK_SORTS,
  type TaskLevelCode,
  type TaskSort,
  type TasksQuery,
} from "./types";

export const DEFAULT_SORT: TaskSort = "rating";

export type CatalogSearch = {
  sort: TaskSort;
  industries: string[];
  levels: TaskLevelCode[];
  page: number;
};

const isTaskSort = (value: string): value is TaskSort =>
  (TASK_SORTS as readonly string[]).includes(value);

const isTaskLevel = (value: string): value is TaskLevelCode =>
  (TASK_LEVELS as readonly string[]).includes(value);

const listParam = (value: string | null): string[] => [
  ...new Set(
    (value ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  ),
];

/** Unknown sort and level values fall back instead of failing the request. */
export const parseCatalogSearch = (search: string): CatalogSearch => {
  const params = new URLSearchParams(search);
  const sort = params.get("sort") ?? "";
  const page = Number(params.get("page") ?? "1");
  return {
    sort: isTaskSort(sort) ? sort : DEFAULT_SORT,
    industries: listParam(params.get("industry")),
    levels: listParam(params.get("level")).filter(isTaskLevel),
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
};

/**
 * Built by hand: `URLSearchParams` would escape the list commas to `%2C`,
 * and the address is meant to be read and shared.
 */
export const buildCatalogSearch = (state: CatalogSearch): string => {
  const parts: string[] = [];
  if (state.sort !== DEFAULT_SORT) parts.push(`sort=${state.sort}`);
  if (state.industries.length)
    parts.push(
      `industry=${state.industries.map(encodeURIComponent).join(",")}`
    );
  if (state.levels.length) parts.push(`level=${state.levels.join(",")}`);
  if (state.page > 1) parts.push(`page=${state.page}`);
  return parts.length ? `?${parts.join("&")}` : "";
};

export const toTasksQuery = (state: CatalogSearch): TasksQuery => {
  const query: TasksQuery = { sort: state.sort, page: state.page };
  if (state.industries.length) query.industry = state.industries.join(",");
  if (state.levels.length) query.level = state.levels.join(",");
  return query;
};

export const hasActiveFilters = (state: CatalogSearch) =>
  state.industries.length > 0 || state.levels.length > 0;

export const toggleValue = <T>(values: T[], value: T): T[] =>
  values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];

/** A 4xx will not change on a second attempt, so only other failures retry. */
export const retryUnlessClientError = (failureCount: number, error: unknown) =>
  !(isApiError(error) && error.status >= 400 && error.status < 500) &&
  failureCount < 1;

export const isNotFound = (error: unknown) =>
  isApiError(error) && error.status === 404;

export const levelLabelKey = (level: TaskLevelCode) =>
  `catalog.levels.${level}`;

const LEVEL_BADGE: Record<TaskLevelCode, BadgeProps["variant"]> = {
  needs_clarification: "muted",
  working: "primary",
  ready: "success",
  priority: "solid",
};

export const levelBadgeVariant = (level: TaskLevelCode) => LEVEL_BADGE[level];

export const isInProgress = (status: { code: string }) =>
  status.code === "in_progress";

export const parseTaskId = (raw: string | undefined): number | null =>
  raw && /^[1-9]\d*$/.test(raw) ? Number(raw) : null;

export type CatalogLinkState = { catalogSearch: string };

/** The card passes the list's search along, so "back" restores sort, filters and page. */
export const backToCatalogHref = (state: unknown): string => {
  const search = (state as Partial<CatalogLinkState> | null)?.catalogSearch;
  return typeof search === "string" && (search === "" || search.startsWith("?"))
    ? `/catalog${search}`
    : "/catalog";
};

export const isBlank = (value: string | null) => !value?.trim();

export const formatPublishedDate = (iso: string, locale: string) =>
  formatDateTime(iso, locale, { dateStyle: "long" });
