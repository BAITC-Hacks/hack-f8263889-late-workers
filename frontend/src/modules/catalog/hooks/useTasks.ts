import { useQuery } from "@tanstack/react-query";

import { listTasks } from "../api/tasks";
import { retryUnlessClientError } from "../helpers";
import { catalogKeys } from "../queryKeys";
import type { TasksQuery } from "../types";

export const useTasks = (query: TasksQuery) =>
  useQuery({
    queryKey: catalogKeys.list(query),
    queryFn: ({ signal }) => listTasks(query, signal),
    retry: retryUnlessClientError,
  });
