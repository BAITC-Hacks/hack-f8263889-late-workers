import { useQuery } from "@tanstack/react-query";

import { fetchHealth } from "../api/health";
import { systemKeys } from "../queryKeys";

export const useHealth = () =>
  useQuery({
    queryKey: systemKeys.health(),
    queryFn: fetchHealth,
    retry: false,
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
  });
