import { sessionEvents } from "@/core/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { logout } from "../api/auth";
import {
  beginSessionTransition,
  endSessionTransition,
  sessionMutationKey,
} from "../sessionTransition";
import { useAuthStore } from "../stores/useAuthStore";

export const useLogout = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationKey: sessionMutationKey,
    mutationFn: logout,
    onMutate: beginSessionTransition,
    onSuccess: (_data, _input, transition) => {
      if (transition?.version !== sessionEvents.version()) return;
      sessionEvents.advance();
      void queryClient.cancelQueries();
      queryClient.clear();
      useAuthStore.getState().clearUser();
      navigate("/login", { replace: true });
    },
    onSettled: (_data, _error, _input, transition) =>
      endSessionTransition(transition),
  });
};
