import type { IncomingMessage, ServerResponse } from "node:http";
import type { Connect } from "vite";

import type { User } from "../src/modules/auth/types.ts";
import {
  type BusinessTask,
  TASK_LEVELS,
  TASK_SORTS,
  type TaskDetail,
  type TaskListItem,
  type TaskSort,
} from "../src/modules/catalog/types.ts";
import {
  type SeedTask,
  industries,
  levels,
  seededTasks,
  statuses,
} from "./catalogData.ts";
import {
  type Fields,
  error,
  json,
  methodNotAllowed,
  noContent,
} from "./http.ts";

const PAGE_SIZE = 20;
const EXCERPT_LENGTH = 140;
const VISIBLE_STATUSES = new Set(["published", "in_progress"]);

const industryByCode = new Map(industries.map((item) => [item.code, item]));

const isVisible = (task: SeedTask) => VISIBLE_STATUSES.has(task.status);

const isOwner = (task: SeedTask, user: User) =>
  user.role === "business" && user.business.id === task.ownerBusinessId;

function excerpt(text: string) {
  if (text.length <= EXCERPT_LENGTH) return text;
  const cut = text.slice(0, EXCERPT_LENGTH);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[\s,.;:—-]+$/, "")}…`;
}

function taskBase(task: SeedTask, saved: boolean) {
  return {
    id: task.id,
    title: task.title,
    companyName: task.companyName,
    industry: industryByCode.get(task.industry)!,
    rating: task.rating,
    level: levels[task.level],
    status: statuses[task.status],
    responsesCount: task.responsesCount,
    publishedAt: task.publishedAt,
    isSaved: saved,
    badges: [],
  };
}

const toListItem = (task: SeedTask, saved: boolean): TaskListItem => ({
  ...taskBase(task, saved),
  needExcerpt: excerpt(task.fields.need ?? ""),
});

const toDetail = (task: SeedTask, user: User, saved: boolean): TaskDetail => ({
  ...taskBase(task, saved),
  isOwner: isOwner(task, user),
  fields: task.fields,
});

const toBusinessTask = (task: SeedTask): BusinessTask => ({
  id: task.id,
  title: task.title,
  status: statuses[task.status],
  rating: task.rating,
  level: levels[task.level],
  responsesCount: task.responsesCount,
  updatedAt: task.updatedAt,
});

const listValues = (value: string | null) =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const comparators: Record<TaskSort, (a: SeedTask, b: SeedTask) => number> = {
  rating: (a, b) => b.rating - a.rating || a.id - b.id,
  date: (a, b) =>
    (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "") || a.id - b.id,
  responses: (a, b) =>
    b.responsesCount - a.responsesCount || b.rating - a.rating,
};

type TasksQuery = {
  sort: TaskSort;
  page: number;
  industries: string[];
  levels: string[];
};

function parseTasksQuery(
  params: URLSearchParams
): { query: TasksQuery } | { fields: Fields } {
  const fields: Fields = {};
  const sort = params.get("sort") || "rating";
  if (!(TASK_SORTS as readonly string[]).includes(sort))
    fields.sort = `Неизвестная сортировка: ${sort}`;

  const page = params.get("page") || "1";
  if (!/^[1-9]\d*$/.test(page))
    fields.page = "Номер страницы — целое число от 1";

  const industryCodes = listValues(params.get("industry"));
  const unknownIndustry = industryCodes.find(
    (code) => !industryByCode.has(code)
  );
  if (unknownIndustry)
    fields.industry = `Неизвестная отрасль: ${unknownIndustry}`;

  const levelCodes = listValues(params.get("level"));
  const unknownLevel = levelCodes.find(
    (code) => !(TASK_LEVELS as readonly string[]).includes(code)
  );
  if (unknownLevel) fields.level = `Неизвестный уровень: ${unknownLevel}`;

  if (Object.keys(fields).length) return { fields };
  return {
    query: {
      sort: sort as TaskSort,
      page: Number(page),
      industries: industryCodes,
      levels: levelCodes,
    },
  };
}

/**
 * Catalog endpoints for Vite dev. Runs inside the auth mock so both share one
 * in-memory session store; saved tasks live in memory until Vite restarts.
 */
export function catalogMock(
  currentUser: (req: IncomingMessage) => User | null
): Connect.NextHandleFunction {
  const tasks = seededTasks();
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const savedByUser = new Map<number, Set<number>>();

  const savedSet = (user: User) => {
    let saved = savedByUser.get(user.id);
    if (!saved) {
      saved = new Set();
      savedByUser.set(user.id, saved);
    }
    return saved;
  };

  const isSaved = (user: User, taskId: number) =>
    savedByUser.get(user.id)?.has(taskId) ?? false;

  const findTask = (rawId: string) =>
    /^[1-9]\d*$/.test(rawId) ? taskById.get(Number(rawId)) : undefined;

  const notFound = (res: ServerResponse) =>
    error(res, 404, "NOT_FOUND", "Задача не найдена");

  const forbidden = (res: ServerResponse) =>
    error(res, 403, "FORBIDDEN", "Недостаточно прав");

  function listTasks(res: ServerResponse, user: User, params: URLSearchParams) {
    const parsed = parseTasksQuery(params);
    if ("fields" in parsed) {
      error(
        res,
        422,
        "VALIDATION_ERROR",
        "Проверьте параметры запроса",
        parsed.fields
      );
      return;
    }
    const { query } = parsed;
    const matching = tasks
      .filter(isVisible)
      .filter(
        (task) =>
          !query.industries.length || query.industries.includes(task.industry)
      )
      .filter(
        (task) => !query.levels.length || query.levels.includes(task.level)
      )
      .sort(comparators[query.sort]);
    const start = (query.page - 1) * PAGE_SIZE;
    json(res, 200, {
      items: matching
        .slice(start, start + PAGE_SIZE)
        .map((task) => toListItem(task, isSaved(user, task.id))),
      page: query.page,
      pageSize: PAGE_SIZE,
      total: matching.length,
    });
  }

  function handle(req: IncomingMessage, res: ServerResponse, path: string) {
    const method = req.method ?? "GET";
    const user = currentUser(req);
    if (!user) {
      error(res, 401, "UNAUTHORIZED", "Требуется вход");
      return;
    }

    if (path === "/api/industries") {
      if (method !== "GET") return methodNotAllowed(res, "GET");
      json(res, 200, { items: industries });
      return;
    }

    if (path === "/api/tasks") {
      if (method !== "GET") return methodNotAllowed(res, "GET");
      const params = new URL(req.url ?? "", "http://mock").searchParams;
      listTasks(res, user, params);
      return;
    }

    if (path === "/api/me/saved-tasks") {
      if (method !== "GET") return methodNotAllowed(res, "GET");
      if (user.role !== "student") return forbidden(res);
      const items = [...savedSet(user)]
        .reverse()
        .map((id) => taskById.get(id))
        .filter((task): task is SeedTask => !!task && isVisible(task))
        .map((task) => toListItem(task, true));
      json(res, 200, { items });
      return;
    }

    if (path === "/api/business/tasks") {
      if (method !== "GET") return methodNotAllowed(res, "GET");
      if (user.role !== "business") return forbidden(res);
      const items = tasks
        .filter((task) => isOwner(task, user))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map(toBusinessTask);
      json(res, 200, { items });
      return;
    }

    const save = path.match(/^\/api\/tasks\/([^/]+)\/save$/);
    if (save) {
      if (method !== "POST" && method !== "DELETE")
        return methodNotAllowed(res, "POST, DELETE");
      if (user.role !== "student") return forbidden(res);
      if (method === "DELETE") {
        const task = findTask(save[1]);
        if (task) savedSet(user).delete(task.id);
        noContent(res);
        return;
      }
      const task = findTask(save[1]);
      if (!task || !isVisible(task)) return notFound(res);
      const saved = savedSet(user);
      // Re-saving moves the task to the top of the saved list.
      saved.delete(task.id);
      saved.add(task.id);
      noContent(res);
      return;
    }

    // Teams and proposals are not mocked: the student task page's proposals
    // block just sees no teams and no proposals.
    if (
      path === "/api/teams/my" ||
      /^\/api\/tasks\/[^/]+\/my-proposals$/.test(path)
    ) {
      if (method !== "GET") return methodNotAllowed(res, "GET");
      if (user.role !== "student") return forbidden(res);
      json(res, 200, { items: [] });
      return;
    }

    const detail = path.match(/^\/api\/tasks\/([^/]+)$/);
    if (detail) {
      if (method !== "GET") return methodNotAllowed(res, "GET");
      const task = findTask(detail[1]);
      if (!task || (!isVisible(task) && !isOwner(task, user)))
        return notFound(res);
      json(res, 200, {
        task: toDetail(task, user, isSaved(user, task.id)),
      });
      return;
    }

    error(res, 404, "NOT_FOUND", "Ресурс не найден");
  }

  const handles = (path: string) =>
    path === "/api/industries" ||
    path === "/api/tasks" ||
    path.startsWith("/api/tasks/") ||
    path === "/api/me/saved-tasks" ||
    path === "/api/business/tasks" ||
    path === "/api/teams/my";

  return (req, res, next) => {
    const path = req.url?.split("?")[0] ?? "";
    if (!handles(path)) {
      next();
      return;
    }
    try {
      handle(req, res, path);
    } catch {
      if (!res.headersSent)
        error(res, 500, "INTERNAL_ERROR", "Не удалось выполнить запрос");
      else res.end();
    }
  };
}
