export type Coded<C extends string = string> = { code: C; name: string };

export type Industry = Coded;

export const TASK_LEVELS = [
  "needs_clarification",
  "working",
  "ready",
  "priority",
] as const;
export type TaskLevelCode = (typeof TASK_LEVELS)[number];

export const TASK_SORTS = ["rating", "date", "responses"] as const;
export type TaskSort = (typeof TASK_SORTS)[number];

export type TaskStatusCode =
  "draft" | "published" | "in_progress" | (string & {});

type TaskBase = {
  id: number;
  title: string;
  companyName: string;
  industry: Industry;
  rating: number;
  level: Coded<TaskLevelCode>;
  status: Coded<TaskStatusCode>;
  responsesCount: number;
  /** Null for a draft, which only its owner can open. */
  publishedAt: string | null;
  isSaved: boolean;
  badges: Coded[];
};

export type TaskListItem = TaskBase & { needExcerpt: string };

export const TASK_FIELDS = [
  "context",
  "need",
  "targetUsers",
  "dataMaterials",
  "constraints",
  "expectedResult",
  "successCriteria",
  "contact",
  "interactionFormat",
] as const;
export type TaskFieldKey = (typeof TASK_FIELDS)[number];

export type TaskDetail = TaskBase & {
  isOwner: boolean;
  fields: Record<TaskFieldKey, string | null>;
};

export type BusinessTask = {
  id: number;
  title: string;
  status: Coded<TaskStatusCode>;
  rating: number;
  level: Coded<TaskLevelCode>;
  responsesCount: number;
  updatedAt: string;
};

export type TasksQuery = {
  sort: TaskSort;
  page: number;
  /** Comma-separated industry codes. */
  industry?: string;
  /** Comma-separated level codes. */
  level?: string;
  /** Comma-separated badge codes; tasks must have all selected badges. */
  badge?: string;
};

export type TasksPage = {
  items: TaskListItem[];
  page: number;
  pageSize: number;
  total: number;
};

export type ItemsResponse<T> = { items: T[] };
export type TaskResponse = { task: TaskDetail };
