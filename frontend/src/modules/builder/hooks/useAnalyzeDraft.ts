import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { createRound } from "../api/builder";
import { conflictMessage } from "../helpers";
import { useTaskCache } from "./useTaskCache";

export const useAnalyzeDraft = (taskId: number) => {
  const { t } = useTranslation();
  const { apply, reload } = useTaskCache();
  const mutation = useMutation({
    mutationFn: () => createRound(taskId),
    onSuccess: apply,
    // A 409 means the task moved on elsewhere: show where it is now.
    onError: (error) => {
      if (conflictMessage(error) !== null) reload(taskId);
    },
  });

  return {
    analyze: () => mutation.mutate(),
    pending: mutation.isPending,
    error: mutation.error
      ? (conflictMessage(mutation.error) ?? t("builder.analyze.error"))
      : null,
  };
};
