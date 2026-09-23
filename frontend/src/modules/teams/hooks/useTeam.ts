import { retryUnlessClientError } from "@/common/lib/query";
import { useQuery } from "@tanstack/react-query";

import { getTeam } from "../api/teams";
import { teamsKeys } from "../queryKeys";

/** `null` is a malformed id from the address: nothing to request. */
export const useTeam = (id: number | null) =>
  useQuery({
    queryKey: teamsKeys.detail(id ?? 0),
    queryFn: ({ signal }) => getTeam(id!, signal),
    enabled: id !== null,
    retry: retryUnlessClientError,
  });
