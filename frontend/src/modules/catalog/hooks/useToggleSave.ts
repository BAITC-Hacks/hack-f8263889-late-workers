import { showToast } from "@/common/lib/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { saveTask, unsaveTask } from "../api/tasks";
import { markSavedInPage, withSavedFlag, withoutTask } from "../helpers";
import { catalogKeys } from "../queryKeys";
import type { TaskDetail, TaskListItem, TasksPage } from "../types";

type ToggleSaveInput = { id: number; isSaved: boolean };

/**
 * Not optimistic: the button waits for the 204, then every cached copy of
 * the task is updated so the catalog, the task page and the saved list agree.
 */
export const useToggleSave = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ id, isSaved }: ToggleSaveInput) =>
      isSaved ? unsaveTask(id) : saveTask(id),
    onSuccess: (_data, { id, isSaved }) => {
      const nowSaved = !isSaved;
      queryClient.setQueriesData<TasksPage>(
        { queryKey: catalogKeys.lists() },
        (page) => page && markSavedInPage(page, id, nowSaved)
      );
      queryClient.setQueryData<TaskDetail>(
        catalogKeys.detail(id),
        (task) => task && withSavedFlag(task, id, nowSaved)
      );
      if (nowSaved)
        void queryClient.invalidateQueries({ queryKey: catalogKeys.saved() });
      else
        queryClient.setQueryData<TaskListItem[]>(
          catalogKeys.saved(),
          (items) => items && withoutTask(items, id)
        );
    },
    onError: () => showToast(t("save.error")),
  });
};
