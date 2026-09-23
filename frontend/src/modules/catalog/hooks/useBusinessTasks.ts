import { useQuery } from "@tanstack/react-query";

import { listBusinessTasks } from "../api/tasks";
import { retryUnlessClientError } from "../helpers";
import { catalogKeys } from "../queryKeys";

export const useBusinessTasks = () =>
  useQuery({
    queryKey: catalogKeys.business(),
    queryFn: ({ signal }) => listBusinessTasks(signal),
    retry: retryUnlessClientError,
  });
