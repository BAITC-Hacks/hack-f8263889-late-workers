import { retryUnlessClientError } from "@/common/lib/query";
import { useQuery } from "@tanstack/react-query";

import { getBadges } from "../api/gamification";
import { gamificationKeys } from "../queryKeys";

export const useBadges = (enabled = true) =>
  useQuery({
    queryKey: gamificationKeys.badges(),
    queryFn: ({ signal }) => getBadges(signal),
    enabled,
    staleTime: 30 * 60 * 1000,
    retry: retryUnlessClientError,
  });
