import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateProfile } from "../api/auth";
import { authKeys } from "../queryKeys";
import { useAuthStore } from "../stores/useAuthStore";

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (user) => {
      queryClient.setQueryData(authKeys.me(), user);
      useAuthStore.getState().setUser(user);
      // Team skills and member cards are derived from the profile, so every
      // cached view outside auth may now be stale.
      void queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] !== authKeys.all[0],
      });
    },
  });
};
