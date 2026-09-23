import type { TasksQuery } from "./types";

export const catalogKeys = {
  all: ["catalog"] as const,
  lists: () => [...catalogKeys.all, "list"] as const,
  list: (query: TasksQuery) => [...catalogKeys.lists(), query] as const,
  details: () => [...catalogKeys.all, "detail"] as const,
  detail: (id: number) => [...catalogKeys.details(), id] as const,
  saved: () => [...catalogKeys.all, "saved"] as const,
  business: () => [...catalogKeys.all, "business"] as const,
  industries: () => [...catalogKeys.all, "industries"] as const,
};
