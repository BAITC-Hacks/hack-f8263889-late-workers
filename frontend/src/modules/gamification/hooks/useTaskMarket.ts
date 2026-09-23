import { retryUnlessClientError } from "@/common/lib/query";
import { useQuery } from "@tanstack/react-query";

import { getTaskMarket } from "../api/gamification";
import { hasMarket } from "../helpers";
import { gamificationKeys } from "../queryKeys";

export const useTaskMarket = (id: number, status: string) =>
  useQuery({
    queryKey: gamificationKeys.market(id),
    queryFn: ({ signal }) => getTaskMarket(id, signal),
    enabled: hasMarket(status),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    retry: retryUnlessClientError,
  });
