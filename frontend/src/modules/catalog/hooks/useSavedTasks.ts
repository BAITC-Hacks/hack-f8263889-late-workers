import { useQuery } from "@tanstack/react-query";

import { listSavedTasks } from "../api/tasks";
import { retryUnlessClientError } from "../helpers";
import { catalogKeys } from "../queryKeys";

export const useSavedTasks = () =>
  useQuery({
    queryKey: catalogKeys.saved(),
    queryFn: ({ signal }) => listSavedTasks(signal),
    retry: retryUnlessClientError,
  });
