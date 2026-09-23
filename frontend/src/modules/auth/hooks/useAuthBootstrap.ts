import { isApiError, sessionEvents } from "@/core/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { getMe } from "../api/auth";
import { authKeys } from "../queryKeys";
import { useAuthStore } from "../stores/useAuthStore";

export const useAuthBootstrap = () => {
  const status = useAuthStore((state) => state.status);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: authKeys.me(),
    queryFn: async ({ signal }) => {
      try {
        return await getMe(signal, true);
      } catch (error) {
        if (isApiError(error) && error.status === 401) return null;
        throw error;
      }
    },
    enabled: status === "loading",
    retry: false,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (status !== "loading" || query.isFetching) return;
    const store = useAuthStore.getState();
    if (query.isSuccess) {
      if (query.data) store.setUser(query.data);
      else store.clearUser();
    } else if (query.isError) store.setError();
  }, [status, query.data, query.isSuccess, query.isError, query.isFetching]);

  useEffect(
    () =>
      sessionEvents.subscribe(() => {
        void queryClient.cancelQueries();
        queryClient.clear();
        useAuthStore.getState().clearUser();
        navigate("/login", { replace: true });
      }),
    [queryClient, navigate]
  );

  const retry = () => {
    useAuthStore.getState().setLoading();
    void query.refetch();
  };

  return { status, retry };
};
