import { retryUnlessClientError } from "@/common/lib/query";
import { useQuery } from "@tanstack/react-query";

import { getMyTeams } from "../api/teams";
import { teamsKeys } from "../queryKeys";

export const useMyTeams = () =>
  useQuery({
    queryKey: teamsKeys.my(),
    queryFn: ({ signal }) => getMyTeams(signal),
    retry: retryUnlessClientError,
  });
