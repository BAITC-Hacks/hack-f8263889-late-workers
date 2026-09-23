import { useQueryClient } from "@tanstack/react-query";

import { useAuthStore } from "../stores/useAuthStore";

/** Drop the token and every cached query — nothing personal survives sign-out. */
export const useLogout = () => {
  const queryClient = useQueryClient();
  const logout = useAuthStore((state) => state.logout);

  return () => {
    logout();
    queryClient.clear();
  };
};
