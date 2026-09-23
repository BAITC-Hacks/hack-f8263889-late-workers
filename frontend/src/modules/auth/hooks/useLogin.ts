import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type LoginInput, fetchMe, login } from "../api/auth";
import { authKeys } from "../queryKeys";
import { useAuthStore } from "../stores/useAuthStore";

/** Exchange credentials for a JWT, store it and warm up the `me` query. */
export const useLogin = () => {
  const queryClient = useQueryClient();
  const setToken = useAuthStore((state) => state.setToken);

  return useMutation({
    mutationFn: (input: LoginInput) => login(input),
    onSuccess: ({ access_token }) => {
      // Wipe everything cached for a previous session (mirrors useLogout) —
      // invalidating authKeys alone would leave another user's data fresh.
      queryClient.clear();
      setToken(access_token);
      // Prefetch the new user (not awaited — navigation shouldn't wait on it).
      void queryClient.prefetchQuery({
        queryKey: authKeys.me(),
        queryFn: fetchMe,
      });
    },
  });
};
