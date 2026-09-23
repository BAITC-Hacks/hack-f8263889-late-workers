import { useQuery } from "@tanstack/react-query";

import { fetchMe } from "../api/auth";
import { authKeys } from "../queryKeys";
import { useAuthStore } from "../stores/useAuthStore";

/** The signed-in user — fetched only while a token exists, never retried (a 401 logs out). */
export const useMe = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: authKeys.me(),
    queryFn: fetchMe,
    enabled: isAuthenticated,
    retry: false,
  });
};
