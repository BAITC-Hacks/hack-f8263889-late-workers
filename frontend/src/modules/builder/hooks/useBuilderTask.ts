import { retryUnlessClientError } from "@/modules/catalog";
import { useQuery } from "@tanstack/react-query";

import { getBuilderTask } from "../api/builder";
import { builderKeys } from "../queryKeys";

/** `null` is a malformed id from the address: nothing to request. */
export const useBuilderTask = (id: number | null) =>
  useQuery({
    queryKey: builderKeys.detail(id ?? 0),
    queryFn: ({ signal }) => getBuilderTask(id!, signal),
    enabled: id !== null,
    retry: retryUnlessClientError,
  });
