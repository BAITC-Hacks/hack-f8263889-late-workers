import type { BadgeProps } from "@/common/components/ui";
import { parseId } from "@/common/lib/query";
import { formatDateTime, getFieldErrors, isApiError } from "@/core/api";

import {
  type BusinessTask,
  TASK_LEVELS,
  TASK_SORTS,
  type TaskLevelCode,
  type TaskListItem,
  type TaskSort,
  type TasksPage,
  type TasksQuery,
} from "./types";

export { isNotFound, retryUnlessClientError } from "@/common/lib/query";

export const DEFAULT_SORT: TaskSort = "rating";

export type CatalogSearch = {
  sort: TaskSort;
  industries: string[];
  levels: TaskLevelCode[];
  badges: string[];
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
    badges: listParam(params.get("badge")?.toLowerCase() ?? null),
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
  if (state.badges.length)
    parts.push(`badge=${state.badges.map(encodeURIComponent).join(",")}`);
  if (state.page > 1) parts.push(`page=${state.page}`);
  return parts.length ? `?${parts.join("&")}` : "";
};

export const toTasksQuery = (state: CatalogSearch): TasksQuery => {
  const query: TasksQuery = { sort: state.sort, page: state.page };
  if (state.industries.length) query.industry = state.industries.join(",");
  if (state.levels.length) query.level = state.levels.join(",");
  if (state.badges.length) query.badge = state.badges.join(",");
  return query;
};

export const hasActiveFilters = (state: CatalogSearch) =>
  state.industries.length > 0 ||
  state.levels.length > 0 ||
  state.badges.length > 0;

export const catalogBadgeError = (error: unknown): string | undefined =>
  isApiError(error) && error.status === 422
    ? getFieldErrors(error).badge
    : undefined;

export const toggleValue = <T>(values: T[], value: T): T[] =>
  values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];

export const levelLabelKey = (level: TaskLevelCode) =>
  `catalog.levels.${level}`;

const LEVEL_BADGE: Record<TaskLevelCode, BadgeProps["variant"]> = {
  needs_clarification: "muted",
  working: "primary",
  ready: "success",
  priority: "solid",
};

export const levelBadgeVariant = (level: TaskLevelCode) => LEVEL_BADGE[level];

const LEVEL_PROGRESS: Record<TaskLevelCode, string> = {
  needs_clarification: "bg-muted-foreground",
  working: "bg-primary",
  ready: "bg-success",
  priority: "bg-primary",
};

export const levelProgressClass = (level: TaskLevelCode) =>
  LEVEL_PROGRESS[level];

export const isInProgress = (status: { code: string }) =>
  status.code === "in_progress";

export const parseTaskId = parseId;

export const builderPath = (id: number) => `/business/tasks/${id}/builder`;
export const taskProposalsPath = (id: number) =>
  `/business/tasks/${id}/proposals`;

/** Statuses finished in the builder; a task past them opens its catalog page. */
const BUILDER_STATUSES = new Set(["draft", "clarifying", "review"]);

export const businessTaskHref = (task: BusinessTask) =>
  BUILDER_STATUSES.has(task.status.code)
    ? builderPath(task.id)
    : `/catalog/${task.id}`;

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

export const formatUpdatedDate = (iso: string, locale: string) =>
  formatDateTime(iso, locale, { dateStyle: "medium" });

const STATUS_BADGE: Record<string, BadgeProps["variant"]> = {
  published: "success",
  in_progress: "warning",
};

export const statusBadgeVariant = (status: { code: string }) =>
  STATUS_BADGE[status.code] ?? "muted";

export const withSavedFlag = <T extends { id: number; isSaved: boolean }>(
  task: T,
  id: number,
  isSaved: boolean
): T => (task.id === id ? { ...task, isSaved } : task);

export const markSavedInPage = (
  page: TasksPage,
  id: number,
  isSaved: boolean
): TasksPage => ({
  ...page,
  items: page.items.map((task) => withSavedFlag(task, id, isSaved)),
});

export const withoutTask = (items: TaskListItem[], id: number) =>
  items.filter((task) => task.id !== id);
