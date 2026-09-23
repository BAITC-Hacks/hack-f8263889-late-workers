import { retryUnlessClientError } from "@/common/lib/query";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { getTaskProposals } from "../api/selection";
import { selectionKeys } from "../queryKeys";

/** `null` is a malformed id from the address: nothing to request. */
export const useTaskProposals = (taskId: number | null) =>
  useQuery({
    queryKey: selectionKeys.task(taskId ?? 0),
    queryFn: ({ signal }) => getTaskProposals(taskId!, signal),
    enabled: taskId !== null,
    retry: retryUnlessClientError,
  });

/** After a 409 the cached list no longer matches the server. */
export const useReloadProposals = (taskId: number) => {
  const queryClient = useQueryClient();
  return () =>
    void queryClient.invalidateQueries({
      queryKey: selectionKeys.task(taskId),
    });
};
