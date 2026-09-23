import { sessionEvents } from "@/core/api";
import {
  useIsMutating,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { homeForUser } from "../helpers";
import { authKeys } from "../queryKeys";
import {
  beginSessionTransition,
  endSessionTransition,
  sessionMutationKey,
} from "../sessionTransition";
import { useAuthStore } from "../stores/useAuthStore";
import type { User } from "../types";

export const useSessionMutation = <T>(
  mutationFn: (input: T) => Promise<User>
) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const pending = useIsMutating({ mutationKey: sessionMutationKey });
  const mutation = useMutation({
    mutationKey: sessionMutationKey,
    mutationFn,
    onMutate: beginSessionTransition,
    onSuccess: (user, _input, transition) => {
      if (transition?.version !== sessionEvents.version()) return;
      sessionEvents.advance();
      void queryClient.cancelQueries();
      queryClient.clear();
      queryClient.setQueryData(authKeys.me(), user);
      useAuthStore.getState().setUser(user);
      navigate(homeForUser(user), { replace: true });
    },
    onSettled: (_data, _error, _input, transition) =>
      endSessionTransition(transition),
  });
  return { ...mutation, isPending: mutation.isPending || pending > 0 };
};
