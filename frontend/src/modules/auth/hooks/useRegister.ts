import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type RegisterInput, fetchMe, login, register } from "../api/auth";
import { authKeys } from "../queryKeys";
import { useAuthStore } from "../stores/useAuthStore";

/** Create the account, then log in with the same credentials so the user lands signed-in. */
export const useRegister = () => {
  const queryClient = useQueryClient();
  const setToken = useAuthStore((state) => state.setToken);

  return useMutation({
    mutationFn: async (input: RegisterInput) => {
      await register(input);
      return login({ email: input.email, password: input.password });
    },
    onSuccess: ({ access_token }) => {
      // Wipe everything cached for a previous session (mirrors useLogout).
      queryClient.clear();
      setToken(access_token);
      void queryClient.prefetchQuery({
        queryKey: authKeys.me(),
        queryFn: fetchMe,
      });
    },
  });
};
