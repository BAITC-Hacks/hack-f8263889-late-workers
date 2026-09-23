import { useQuery } from "@tanstack/react-query";

import { getTask } from "../api/tasks";
import { retryUnlessClientError } from "../helpers";
import { catalogKeys } from "../queryKeys";

/** `null` is a malformed id from the address: nothing to request. */
export const useTask = (id: number | null) =>
  useQuery({
    queryKey: catalogKeys.detail(id ?? 0),
    queryFn: ({ signal }) => getTask(id!, signal),
    enabled: id !== null,
    retry: retryUnlessClientError,
  });
